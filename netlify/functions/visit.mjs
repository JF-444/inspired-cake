import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse|pingdom|curl|wget/i;
const VIEWS = ["accueil", "noel", "realisations", "carte", "livraison", "histoire", "faq", "commander"];
const parisDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const isAdmin = (req) => { const k = Netlify.env.get("ADMIN_KEY"); return !!k && req.headers.get("x-admin-key") === k; };

export default async (req) => {
  const store = getStore({ name: "visites", consistency: "strong" });

  if (req.method === "POST") {
    if (BOT.test(req.headers.get("user-agent") || "")) return json({ ok: true });
    let b = {};
    try { b = await req.json(); } catch {}
    const view = VIEWS.includes(b.v) ? b.v : "accueil";
    const key = "d/" + parisDay();
    // Écriture conditionnelle pour ne pas perdre de visite si deux arrivent en même temps
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = await store.getWithMetadata(key, { type: "json" });
      const data = cur?.data || { n: 0, pages: {} };
      if (b.first === true) data.n += 1;
      data.pages[view] = (data.pages[view] || 0) + 1;
      const opts = cur?.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
      const res = await store.setJSON(key, data, opts);
      if (!res || res.modified !== false) break;
    }
    return json({ ok: true });
  }

  if (!isAdmin(req)) return json({ error: "Clé incorrecte." }, 403);

  if (req.method === "GET") {
    const now = Date.now();
    const keys = Array.from({ length: 60 }, (_, i) => parisDay(new Date(now - i * 86400000)));
    const vals = await Promise.all(keys.map((k) => store.get("d/" + k, { type: "json" })));
    const days = keys.map((k, i) => vals[i] && { date: k, n: vals[i].n || 0, pages: vals[i].pages || {} }).filter(Boolean);
    return json({ days });
  }

  return json({ error: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/visit" };
