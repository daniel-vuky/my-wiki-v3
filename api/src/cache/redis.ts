import Redis from "ioredis";
import { env } from "../env.js";

export const redis = (globalThis as any).__TEST__ ? (null as any) : new Redis(env.REDIS_URL);

export function cacheKey(ns: string, userId: string, suffix?: string): string {
  return suffix ? `${ns}:${userId}:${suffix}` : `${ns}:${userId}`;
}

export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await fn();
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  return value;
}

export async function invalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(keys);
}
