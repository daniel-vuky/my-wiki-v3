import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { listTags } from "../services/tags.js";

export async function tagRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.get("/api/tags", async (req) => listTags(req.userId!));
}
