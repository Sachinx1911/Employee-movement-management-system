// Turns DATABASE_URL (mysql://USER:PASSWORD@HOST:PORT/DB) into a MariaDB/MySQL
// pool config. Shared by the app (lib/db.ts) and the seed script.
import type { PrismaMariaDb } from "@prisma/adapter-mariadb";

type PoolConfig = Exclude<ConstructorParameters<typeof PrismaMariaDb>[0], string | { getConnection: unknown }>;

export function mysqlPoolConfig(url = process.env.DATABASE_URL): PoolConfig {
  if (!url) throw new Error("DATABASE_URL is not set");
  const u = new URL(url);
  if (u.protocol !== "mysql:" && u.protocol !== "mariadb:") {
    throw new Error("DATABASE_URL must start with mysql:// (e.g. mysql://user:password@localhost:3306/database)");
  }
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    connectionLimit: Number(u.searchParams.get("connection_limit") ?? 5),
    // MySQL 8 default auth over a non-SSL local connection needs this.
    allowPublicKeyRetrieval: true,
    // DATETIME values are stored and read as UTC.
    timezone: "Z",
  };
}
