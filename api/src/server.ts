import { buildApp } from "./app.js";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";

const app = buildApp();
await runMigrations();
await app.listen({ host: "0.0.0.0", port: env.API_PORT });
console.log(`api listening on ${env.API_PORT}`);
