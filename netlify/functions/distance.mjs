import { getStore } from "@netlify/blobs";

// Le point de départ reste côté serveur : il vient de la variable d'environnement ADRESSE_DEPART
// (ou, à défaut, du centre de Chanteloup-les-Vignes). Il n'est jamais renvoyé au navigateur.
const TOWN = { lat: 48.9783, lon: 2.0333 };
const ROAD = 1.3;
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function haversine(a, b) {
  const R = 6371, t = (x) => (x * Math.PI) / 180;
  const h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function base() {
  const addr = (Netlify.env.get("ADRESSE_DEPART") || "").trim();
  if (!addr) return TOWN;
  const store = getStore({ name: "reglages" });
  const cached = await store.get("depart", { type: "json" });
  if (cached && cached.addr === addr) return cached;
  const qs = `?q=${encodeURIComponent(addr)}&limit=1&lat=${TOWN.lat}&lon=${TOWN.lon}`;
  for (const u of ["https://data.geopf.fr/geocodage/search/" + qs, "https://api-adresse.data.gouv.fr/search/" + qs]) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const f = (await r.json()).features?.[0];
      if (f?.geometry?.coordinates) {
        const b = { addr, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
        await store.setJSON("depart", b);
        return b;
      }
    } catch {}
  }
  return TOWN;
}

export default async (req) => {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat")), lon = Number(u.searchParams.get("lon"));
  if (!(lat > 41 && lat < 52 && lon > -6 && lon < 10)) return json({ error: "Position invalide." }, 400);
  const b = await base();
  const km = Math.max(1, Math.round(haversine(b, { lat, lon }) * ROAD));
  return json({ km });
};

export const config = { path: "/api/distance" };
