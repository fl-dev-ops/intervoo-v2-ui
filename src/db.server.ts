import { PrismaClient } from "./generated/prisma/client.js";

// import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

// const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });

declare global {
  var __prisma: PrismaClient | undefined;
}

const cachedPrisma = globalThis.__prisma;
const cachedPrismaHasCurrentSchema = cachedPrisma && "diagnosticSession" in cachedPrisma;

export const prisma = cachedPrismaHasCurrentSchema ? cachedPrisma : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
