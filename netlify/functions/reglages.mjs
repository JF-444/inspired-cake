import { getStore } from "@netlify/blobs";

// Coordonnées de paiement et adresse de retrait : réservées à l'espace gestion (clé ADMIN_KEY).
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const line = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export default async (req) => {
  const key = Netlify.env.get("ADMIN_KEY");
  if (!key || req.headers.get("x-admin-key") !== key) return json({ error: "Clé incorrecte." }, 403);
  const store = getStore({ name: "reglages", consistency: "strong" });
  if (req.method === "GET") return json({ settings: (await store.get("paiement", { type: "json" })) || {} });
  if (req.method === "PUT") {
    let b;
    try { b = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }
    const dep = Number(b.deposit);
    const settings = {
      paypal: line(b.paypal, 160), holder: line(b.holder, 80), iban: line(b.iban, 42).toUpperCase(),
      bic: line(b.bic, 15).toUpperCase(), address: line(b.address, 160),
      deposit: isNaN(dep) ? 40 : Math.min(100, Math.max(0, Math.round(dep))),
    };
    await store.setJSON("paiement", settings);
    return json({ settings });
  }
  return json({ error: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/reglages" };
