import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth/middleware.js";
import { db } from "../db/client.js";
import { prefs } from "../db/schema.js";

export async function prefsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.patch("/api/prefs", {
    schema: { body: { type: "object", properties: {
      theme: { type: "string" }, accent: { type: "string" }, editorFont: { type: "string" },
    } } },
  }, async (req) => {
    const body = req.body as Partial<{ theme: string; accent: string; editorFont: string }>;
    await db.insert(prefs).values({ userId: req.userId!, ...body })
      .onConflictDoUpdate({ target: prefs.userId, set: body });
    const [p] = await db.select().from(prefs).where(eq(prefs.userId, req.userId!));
    return p;
  });
}
