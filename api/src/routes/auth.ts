import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, prefs } from "../db/schema.js";
import { env } from "../env.js";
import { buildAuthUrl, exchangeCode } from "../auth/google.js";
import { createSession, destroySession, getSessionUser, COOKIE_NAME, cookieOptions } from "../auth/session.js";

const redirectUri = () => `${env.PUBLIC_BASE_URL}/api/auth/google/callback`;

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/google", async (_req, reply) => {
    const state = Math.random().toString(36).slice(2);
    reply.setCookie("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
    reply.redirect(buildAuthUrl({ clientId: env.GOOGLE_CLIENT_ID, redirectUri: redirectUri(), state }));
  });

  app.get("/api/auth/google/callback", async (req, reply) => {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state || state !== req.cookies.oauth_state) {
      return reply.code(400).send({ error: { code: "bad_state", message: "Invalid OAuth state" } });
    }
    const profile = await exchangeCode({
      code, clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: redirectUri(),
    });
    if (env.ALLOWED_EMAILS.length && !env.ALLOWED_EMAILS.includes(profile.email)) {
      return reply.code(403).send({ error: { code: "forbidden", message: "Email not allowed" } });
    }
    const existing = await db.select().from(users).where(eq(users.googleSub, profile.sub));
    let userId: string;
    if (existing[0]) {
      userId = existing[0].id;
      await db.update(users).set({ name: profile.name, email: profile.email, avatarUrl: profile.picture, updatedAt: new Date() }).where(eq(users.id, userId));
    } else {
      const [row] = await db.insert(users).values({
        googleSub: profile.sub, email: profile.email, name: profile.name, avatarUrl: profile.picture,
      }).returning({ id: users.id });
      userId = row.id;
      await db.insert(prefs).values({ userId });
    }
    const token = await createSession(userId);
    reply.setCookie(COOKIE_NAME, token, cookieOptions());
    reply.redirect("/");
  });

  app.post("/api/auth/logout", async (req, reply) => {
    await destroySession(req.cookies[COOKIE_NAME]);
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const userId = await getSessionUser(req.cookies[COOKIE_NAME]);
    if (!userId) return reply.code(401).send({ error: { code: "unauthorized", message: "Not signed in" } });
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    const [p] = await db.select().from(prefs).where(eq(prefs.userId, userId));
    return { user: u, prefs: p };
  });
}
