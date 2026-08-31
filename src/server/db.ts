import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { getDatabaseEnv } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const env = getDatabaseEnv();
  const url = new URL(env.DATABASE_URL);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: env.DATABASE_CONNECTION_LIMIT,
    acquireTimeout: 30_000,
    connectTimeout: 15_000,
    idleTimeout: 300,
    ssl: env.DATABASE_SSL
      ? {
          rejectUnauthorized: true,
          ...(env.DATABASE_SSL_CA_BASE64
            ? { ca: Buffer.from(env.DATABASE_SSL_CA_BASE64, "base64").toString("utf8") }
            : {}),
        }
      : false,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  zambielPrisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.zambielPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.zambielPrisma = prisma;
}
