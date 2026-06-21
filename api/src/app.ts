import Fastify, { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.js";
import { folderRoutes } from "./routes/folders.js";
import { noteRoutes } from "./routes/notes.js";
import { tagRoutes } from "./routes/tags.js";
import { searchRoutes } from "./routes/search.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.register(folderRoutes);
  app.register(noteRoutes);
  app.register(tagRoutes);
  app.register(searchRoutes);
  app.get("/api/health", async () => ({ status: "ok" }));
  return app;
}
