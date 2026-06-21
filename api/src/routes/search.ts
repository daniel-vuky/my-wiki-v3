import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { searchNotes } from "../services/search.js";
import { cacheKey, cached } from "../cache/redis.js";

export async function searchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.get("/api/search", async (req) => {
    const { q = "", folder } = req.query as { q?: string; folder?: string };
    return cached(cacheKey("search", req.userId!, `${q}|${folder ?? ""}`), 30,
      () => searchNotes(req.userId!, q, { folderId: folder }));
  });
}
