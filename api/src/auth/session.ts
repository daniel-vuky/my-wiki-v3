import { randomBytes } from "node:crypto";
import { redis } from "../cache/redis.js";
import { env } from "../env.js";

const TTL_SEC = 60 * 60 * 24 * 30; // 30 days
export const COOKIE_NAME = "folio_session";

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}
export function sessionRedisKey(token: string): string {
  return `session:${token}`;
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  await redis.set(sessionRedisKey(token), userId, "EX", TTL_SEC);
  return token;
}
export async function getSessionUser(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const userId = await redis.get(sessionRedisKey(token));
  if (userId) await redis.expire(sessionRedisKey(token), TTL_SEC);
  return userId;
}
export async function destroySession(token: string | undefined): Promise<void> {
  if (token) await redis.del(sessionRedisKey(token));
}
export function cookieOptions() {
  const secure = (env.PUBLIC_BASE_URL ?? "").startsWith("https");
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: TTL_SEC };
}
