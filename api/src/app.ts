import Fastify, { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { folderRoutes } from "./routes/folders.js";
import { noteRoutes } from "./routes/notes.js";
import { tagRoutes } from "./routes/tags.js";
import { searchRoutes } from "./routes/search.js";
import { uploadRoutes } from "./routes/uploads.js";
import { prefsRoutes } from "./routes/prefs.js";
import { redis } from "./cache/redis.js";
import { env } from "./env.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: !(globalThis as any).__TEST__ });
  app.register(cookie, { secret: env.SESSION_SECRET });
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  app.register(rateLimit, { max: 300, timeWindow: "1 minute", ...((globalThis as any).__TEST__ ? {} : { redis }) });
  app.register(authRoutes);
  app.register(folderRoutes);
  app.register(noteRoutes);
  app.register(tagRoutes);
  app.register(searchRoutes);
  app.register(uploadRoutes);
  app.register(prefsRoutes);
  app.get("/api/health", async () => ({ status: "ok" }));
  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => reply.code(err.statusCode ?? 500).send({ error: { code: "internal", message: err.message } }));
  return app;
}
