import { PrismaClient } from "../src/generated/prisma/client.js";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  console.log(`✅ Created :P`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
