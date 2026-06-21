import Fastify, { FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.get("/api/health", async () => ({ status: "ok" }));
  return app;
}
