// Local development MySQL (no install needed — downloads MySQL on first run).
// Usage: npm run db:start   — keep this terminal open; Ctrl+C stops it.
// The database is temporary: each start applies migrations and loads demo data.
// Production uses Hostinger's MySQL via DATABASE_URL instead.
import { createDB } from "mysql-memory-server";
import { execSync } from "node:child_process";

const port = Number(process.env.LOCAL_DB_PORT ?? 3307);
const db = await createDB({ version: "8.4.x", dbName: "ddsr_movement", port, logLevel: "WARN" });
const url = `mysql://${db.username}@127.0.0.1:${db.port}/${db.dbName}`;
console.log(`MySQL ${db.mysql.version} ready on port ${db.port} — ${url}`);

const env = { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url, SEED_DEMO: "true" };
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
console.log("Local database is ready. Keep this window open while developing.");

const shutdown = async () => {
  await db.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
