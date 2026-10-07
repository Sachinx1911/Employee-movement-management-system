// Local development PostgreSQL (no Docker / no install needed).
// Usage: npm run db:start   — keeps running until Ctrl+C.
// Production should use a managed PostgreSQL via DATABASE_URL instead.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".local-db");
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
const dbName = "ddsr_movement";

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();

const client = pg.getPgClient();
await client.connect();
const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
if (!rowCount) await pg.createDatabase(dbName);
await client.end();

console.log(`PostgreSQL ready on port ${port} — database "${dbName}"`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
