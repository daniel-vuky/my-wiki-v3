import { FastifyReply, FastifyRequest } from "fastify";
import { COOKIE_NAME, getSessionUser } from "./session.js";

declare module "fastify" {
  interface FastifyRequest { userId?: string }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies[COOKIE_NAME];
  const userId = await getSessionUser(token);
  if (!userId) {
    reply.code(401).send({ error: { code: "unauthorized", message: "Not signed in" } });
    return;
  }
  req.userId = userId;
}
