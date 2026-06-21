const REQUIRED = [
  "DATABASE_URL", "REDIS_URL", "SESSION_SECRET",
  "PUBLIC_BASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
] as const;

export interface Env {
  DATABASE_URL: string; REDIS_URL: string; SESSION_SECRET: string;
  PUBLIC_BASE_URL: string; GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string;
  API_PORT: number; ALLOWED_EMAILS: string[];
}

export function parseEnv(src: Record<string, string | undefined>): Env {
  for (const k of REQUIRED) {
    if (!src[k]) throw new Error(`Missing required env var: ${k}`);
  }
  return {
    DATABASE_URL: src.DATABASE_URL!, REDIS_URL: src.REDIS_URL!,
    SESSION_SECRET: src.SESSION_SECRET!, PUBLIC_BASE_URL: src.PUBLIC_BASE_URL!,
    GOOGLE_CLIENT_ID: src.GOOGLE_CLIENT_ID!, GOOGLE_CLIENT_SECRET: src.GOOGLE_CLIENT_SECRET!,
    API_PORT: Number(src.API_PORT ?? 3000),
    ALLOWED_EMAILS: (src.ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export const env = (globalThis as any).__TEST__ ? ({} as Env) : parseEnv(process.env);
