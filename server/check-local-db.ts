import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );

  console.log("LOCAL DATABASE TABLES:");
  console.table(tables);
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
