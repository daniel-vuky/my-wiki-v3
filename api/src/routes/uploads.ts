import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { requireAuth } from "../auth/middleware.js";
import { db } from "../db/client.js";
import { uploads } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

const DIR = process.env.UPLOAD_DIR ?? "/app/uploads";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/api/uploads", { preHandler: requireAuth }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: { code: "no_file", message: "No file" } });
    const id = randomUUID();
    const filename = id + extname(file.filename);
    await mkdir(DIR, { recursive: true });
    const buf = await file.toBuffer();
    await writeFile(join(DIR, filename), buf);
    await db.insert(uploads).values({
      id, userId: req.userId!, filename, mime: file.mimetype, size: buf.length, path: join(DIR, filename),
    });
    return { url: `/api/uploads/${id}` };
  });

  app.get("/api/uploads/:id", { preHandler: requireAuth }, async (req, reply) => {
    const [u] = await db.select().from(uploads).where(and(eq(uploads.id, (req.params as any).id), eq(uploads.userId, req.userId!)));
    if (!u) return reply.code(404).send({ error: { code: "not_found", message: "Not found" } });
    reply.header("Content-Type", u.mime);
    reply.header("Cache-Control", "private, max-age=31536000, immutable");
    return reply.send(await readFile(u.path));
  });
}
