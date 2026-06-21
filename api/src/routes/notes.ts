import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import * as svc from "../services/notes.js";
import { invalidate } from "../cache/redis.js";

export async function noteRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  const bust = (u: string) => Promise.all([invalidate(`folders:${u}*`), invalidate(`notes:${u}*`), invalidate(`search:${u}*`)]);

  app.get("/api/notes", async (req) => {
    const q = req.query as { folder?: string; favorite?: string };
    return svc.listNotes(req.userId!, { folderId: q.folder, favorite: q.favorite === "true" });
  });
  app.get("/api/notes/:id", async (req, reply) => {
    const n = await svc.getNote(req.userId!, (req.params as any).id);
    if (!n) return reply.code(404).send({ error: { code: "not_found", message: "Note not found" } });
    reply.header("ETag", `"${new Date(n.updatedAt).getTime()}"`);
    return n;
  });
  app.post("/api/notes", async (req) => { const n = await svc.createNote(req.userId!, req.body as any); await bust(req.userId!); return n; });
  app.patch("/api/notes/:id", async (req) => { const n = await svc.updateNote(req.userId!, (req.params as any).id, req.body as any); await bust(req.userId!); return n; });
  app.post("/api/notes/:id/favorite", async (req) => { const r = await svc.toggleFavorite(req.userId!, (req.params as any).id); await bust(req.userId!); return r; });
  app.delete("/api/notes/:id", async (req) => { await svc.deleteNote(req.userId!, (req.params as any).id); await bust(req.userId!); return { ok: true }; });
}
