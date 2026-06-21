import { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { listFolders, createFolder, updateFolder, deleteFolder } from "../services/folders.js";
import { cacheKey, cached, invalidate } from "../cache/redis.js";

export async function folderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/folders", async (req) =>
    cached(cacheKey("folders", req.userId!), 60, () => listFolders(req.userId!)));

  app.post("/api/folders", {
    schema: {
      body: {
        type: "object",
        required: ["name", "color"],
        properties: {
          name: { type: "string", minLength: 1 },
          color: { type: "string" },
          description: { type: "string" },
          parentId: { type: ["string", "null"] },
        },
      },
    },
  }, async (req) => {
    const row = await createFolder(req.userId!, req.body as any);
    await invalidate(`folders:${req.userId}*`);
    return row;
  });

  app.patch("/api/folders/:id", {
    schema: {
      body: {
        type: "object",
        properties: {
          name: { type: "string" },
          color: { type: "string" },
          description: { type: "string" },
          sortOrder: { type: "number" },
          parentId: { type: ["string", "null"] },
        },
      },
    },
  }, async (req) => {
    const row = await updateFolder(req.userId!, (req.params as any).id, req.body as any);
    await invalidate(`folders:${req.userId}*`);
    return row;
  });

  app.delete("/api/folders/:id", async (req) => {
    await deleteFolder(req.userId!, (req.params as any).id);
    await invalidate(`folders:${req.userId}*`);
    return { ok: true };
  });
}
