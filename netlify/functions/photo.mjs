import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 4 * 1024 * 1024;

export default async (req, context) => {
  const store = getStore({ name: "photos", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = url.searchParams.get("id") || "";
    if (!/^[a-z0-9-]+$/i.test(id)) return new Response("Introuvable", { status: 404 });
    const hit = await store.getWithMetadata("p/" + id, { type: "arrayBuffer" });
    if (!hit) return new Response("Introuvable", { status: 404 });
    return new Response(hit.data, { headers: { "content-type": hit.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  }

  if (req.method === "POST") {
    const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!TYPES.includes(type)) return json({ error: "Format d'image non accepté." }, 415);
    const ip = (context.ip || "inconnu").replace(/[^a-zA-Z0-9]/g, "_");
    const rl = (await store.get("rl/" + ip, { type: "json" })) || { n: 0, t: Date.now() };
    if (Date.now() - rl.t > 600000) { rl.n = 0; rl.t = Date.now(); }
    if (rl.n >= 12) return json({ error: "Trop de photos envoyées. Joignez-la dans la conversation WhatsApp." }, 429);
    const data = await req.arrayBuffer();
    if (!data.byteLength) return json({ error: "Image vide." }, 400);
    if (data.byteLength > MAX) return json({ error: "Photo trop lourde. Joignez-la dans la conversation WhatsApp." }, 413);
    rl.n += 1; await store.setJSON("rl/" + ip, rl);
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await store.set("p/" + id, data, { metadata: { type } });
    return json({ url: `${url.origin}/api/photo?id=${id}` }, 201);
  }

  return json({ error: "Méthode non autorisée." }, 405);
};

export const config = { path: "/api/photo" };
