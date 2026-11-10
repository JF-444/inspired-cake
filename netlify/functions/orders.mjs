import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const line = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const text = (v, max) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T12:00:00Z"));
const STATUSES = ["demande", "confirmee", "terminee", "annulee"];
const price = (v) => (v === null || v === "" || v === undefined || isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v) * 100) / 100));
const photo = (v) => { const s = String(v ?? "").trim(); return /^(https:\/\/[^\s"'<>]+)?\/api\/photo\?id=[a-z0-9-]+$/i.test(s) ? s.slice(0, 300) : ""; };
const mail = (v) => { const s = line(v, 120).toLowerCase(); return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(s) ? s : ""; };
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function isAdmin(req) {
  const key = Netlify.env.get("ADMIN_KEY");
  return !!key && req.headers.get("x-admin-key") === key;
}

export default async (req, context) => {
  const store = getStore({ name: "commandes", consistency: "strong" });

  // Demande envoyée depuis le formulaire du site (public)
  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }
    if (b.site) return json({ error: "Requête refusée." }, 400);
    const date = line(b.date, 10), name = line(b.name, 60);
    if (!isDate(date)) return json({ error: "Date invalide." }, 400);
    if (name.length < 2) return json({ error: "Prénom manquant." }, 400);

    const ip = (context.ip || "inconnu").replace(/[^a-zA-Z0-9]/g, "_");
    const last = await store.get("rl/" + ip, { type: "json" });
    if (last && Date.now() - last.t < 20000) return json({ ok: true, skipped: true });
    await store.setJSON("rl/" + ip, { t: Date.now() });

    const mode = b.mode === "livraison" ? "livraison" : "retrait";
    const order = {
      id: newId(), date, time: "", name, email: mail(b.email), contact: b.channel === "site" ? "Via le site" : "WhatsApp",
      product: line(b.label, 120) || "Demande",
      details: text(b.message, 2000),
      price: price(b.price), status: "demande", mode,
      zone: mode === "livraison" ? line(b.zone, 60) : "",
      address: mode === "livraison" ? line(b.address, 160) : "",
      photo: photo(b.photo), source: "site", createdAt: Date.now(),
    };
    await store.setJSON("o/" + order.id, order);
    return json({ ok: true, id: order.id }, 201);
  }

  if (!isAdmin(req)) return json({ error: "Clé incorrecte." }, 403);

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "o/" });
    const orders = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
    orders.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
    return json({ orders });
  }

  if (req.method === "PUT") {
    let b;
    try { b = await req.json(); } catch { return json({ error: "Requête invalide." }, 400); }
    const id = /^[0-9]+-[a-z0-9]+$/.test(b.id || "") ? b.id : newId();
    const prev = (await store.get("o/" + id, { type: "json" })) || {};
    const date = line(b.date, 10);
    if (!isDate(date)) return json({ error: "Choisissez une date valide." }, 400);
    const name = line(b.name, 60);
    if (!name) return json({ error: "Indiquez le nom du client." }, 400);
    const time = /^\d{2}:\d{2}$/.test(b.time || "") ? b.time : "";
    const order = {
      ...prev, id, date, time, name,
      contact: line(b.contact, 80), email: b.email === undefined ? prev.email || "" : mail(b.email), product: line(b.product, 120), details: text(b.details, 2000),
      price: price(b.price), status: STATUSES.includes(b.status) ? b.status : "confirmee",
      mode: b.mode === "livraison" ? "livraison" : "retrait",
      zone: line(b.zone, 60), address: line(b.address, 160),
      paid: b.paid === undefined ? !!prev.paid : !!b.paid, discount: b.discount === undefined ? !!prev.discount : !!b.discount,
      photo: photo(b.photo ?? prev.photo), source: prev.source || "manuel",
      createdAt: prev.createdAt || Date.now(), updatedAt: Date.now(),
    };
    await store.setJSON("o/" + id, order);
    return json({ order });
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[0-9]+-[a-z0-9]+$/.test(id)) return json({ error: "Commande introuvable." }, 400);
    await store.delete("o/" + id);
    return json({ ok: true });
  }

  return json({ error: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/orders" };
