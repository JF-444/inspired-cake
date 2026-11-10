import { getStore } from "@netlify/blobs";

// Carte de fidélité : 1 tampon par commande confirmée ou terminée avec la même adresse e-mail.
// 7 tampons = -15 % sur la commande suivante, puis la carte repart à zéro (cycle de 8 commandes).
// Ne renvoie que le nombre de tampons, jamais le détail des commandes.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;
const findMail = (v) => (String(v || "").toLowerCase().match(/[^\s@<>"()]+@[^\s@<>"()]+\.[a-z]{2,}/) || [""])[0];

export default async (req, context) => {
  if (req.method !== "GET") return json({ error: "Méthode non autorisée." }, 405);
  const email = String(new URL(req.url).searchParams.get("email") || "").trim().toLowerCase().slice(0, 120);
  if (!EMAIL.test(email)) return json({ error: "Vérifiez votre adresse e-mail." }, 400);

  const store = getStore({ name: "commandes", consistency: "strong" });
  const ip = (context.ip || "inconnu").replace(/[^a-zA-Z0-9]/g, "_");
  const rl = (await store.get("rlf/" + ip, { type: "json" })) || { t: 0, n: 0 };
  const fresh = Date.now() - rl.t > 10 * 60 * 1000;
  if (!fresh && rl.n >= 20) return json({ error: "Trop de recherches. Réessayez dans quelques minutes." }, 429);
  await store.setJSON("rlf/" + ip, fresh ? { t: Date.now(), n: 1 } : { t: rl.t, n: rl.n + 1 });

  const { blobs } = await store.list({ prefix: "o/" });
  const orders = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
  const n = orders.filter((o) => ["confirmee", "terminee"].includes(o.status) && (findMail(o.email) || findMail(o.contact)) === email).length;
  return json({ stamps: n % 8 });
};

export const config = { path: "/api/fidelite" };
