import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;
const keyOf = (email) => "c/" + Buffer.from(email).toString("base64url");
const isAdmin = (req) => { const k = Netlify.env.get("ADMIN_KEY"); return !!k && req.headers.get("x-admin-key") === k; };

export default async (req, context) => {
  const store = getStore({ name: "contacts", consistency: "strong" });

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }
    if (b.site) return json({ error: "Requête refusée." }, 400);
    const email = String(b.email ?? "").trim().toLowerCase().slice(0, 120);
    if (!EMAIL.test(email)) return json({ error: "Vérifiez votre adresse e-mail." }, 400);
    if (b.consent !== true) return json({ error: "Cochez la case pour accepter de recevoir les nouveautés." }, 400);

    const ip = (context.ip || "inconnu").replace(/[^a-zA-Z0-9]/g, "_");
    const rl = (await store.get("rl/" + ip, { type: "json" })) || { n: 0, t: Date.now() };
    if (Date.now() - rl.t > 600000) { rl.n = 0; rl.t = Date.now(); }
    if (rl.n >= 8) return json({ error: "Trop d'inscriptions depuis cet appareil. Réessayez plus tard." }, 429);
    rl.n += 1; await store.setJSON("rl/" + ip, rl);

    const existing = await store.get(keyOf(email), { type: "json" });
    if (existing) return json({ ok: true, already: true });
    const name = String(b.name ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").trim().slice(0, 40);
    await store.setJSON(keyOf(email), { email, name, consent: true, createdAt: Date.now() });
    return json({ ok: true }, 201);
  }

  if (!isAdmin(req)) return json({ error: "Clé incorrecte." }, 403);

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "c/" });
    const contacts = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
    contacts.sort((a, b) => b.createdAt - a.createdAt);
    return json({ contacts });
  }

  if (req.method === "DELETE") {
    const email = (new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
    if (!EMAIL.test(email)) return json({ error: "Adresse invalide." }, 400);
    await store.delete(keyOf(email));
    return json({ ok: true });
  }

  return json({ error: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/contacts" };
