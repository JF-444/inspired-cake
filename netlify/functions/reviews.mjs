import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export default async (req, context) => {
  const store = getStore({ name: "avis", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "r/" });
    const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    const reviews = items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
    return json({ reviews });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }
    if (body.site) return json({ error: "Requête refusée." }, 400); // piège à robots

    const name = clean(body.name, 40);
    const occasion = clean(body.occasion, 60);
    const text = String(body.text ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, 600);
    const rating = Math.round(Number(body.rating));
    if (name.length < 2) return json({ error: "Indiquez votre prénom." }, 400);
    if (text.length < 10) return json({ error: "Écrivez quelques mots de plus (10 caractères minimum)." }, 400);
    if (!(rating >= 1 && rating <= 5)) return json({ error: "Choisissez une note entre 1 et 5 étoiles." }, 400);
    if (/https?:\/\/|www\./i.test(text + name)) return json({ error: "Les liens ne sont pas acceptés dans les avis." }, 400);

    // Limite : un avis toutes les 2 minutes par adresse
    const ip = context.ip || "inconnu";
    const rlKey = "rl/" + ip.replace(/[^a-zA-Z0-9]/g, "_");
    const last = await store.get(rlKey, { type: "json" });
    if (last && Date.now() - last.t < 120000) return json({ error: "Merci ! Patientez un peu avant de publier un autre avis." }, 429);
    await store.setJSON(rlKey, { t: Date.now() });

    const createdAt = Date.now();
    const id = `${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
    const review = { id, name, occasion, text, rating, createdAt };
    await store.setJSON("r/" + id, review);
    return json({ review }, 201);
  }

  if (req.method === "DELETE") {
    const key = Netlify.env.get("ADMIN_KEY");
    if (!key || req.headers.get("x-admin-key") !== key) return json({ error: "Clé incorrecte." }, 403);
    const params = new URL(req.url).searchParams;
    if (params.has("check")) return json({ ok: true });
    const id = params.get("id") || "";
    if (!/^[0-9]+-[a-z0-9]+$/.test(id)) return json({ error: "Avis introuvable." }, 400);
    await store.delete("r/" + id);
    return json({ ok: true });
  }

  return json({ error: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/reviews" };
