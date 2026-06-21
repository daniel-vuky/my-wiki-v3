import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client.js";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => pool.end()).then(() => console.log("migrated"));
}
