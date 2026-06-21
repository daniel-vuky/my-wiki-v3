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

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  app.register(authRoutes);
  app.register(folderRoutes);
  app.register(noteRoutes);
  app.register(tagRoutes);
  app.register(searchRoutes);
  app.register(uploadRoutes);
  app.get("/api/health", async () => ({ status: "ok" }));
  return app;
}
