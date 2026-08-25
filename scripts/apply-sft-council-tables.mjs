import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const sql = readFileSync(new URL("./sql/sft-council-tables.sql", import.meta.url), "utf8");
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

for (const statement of statements) {
  try {
    await prisma.$executeRawUnsafe(statement);
    console.log("OK:", statement.slice(0, 48).replace(/\s+/g, " "), "...");
  } catch (err) {
    console.error("FAIL:", err instanceof Error ? err.message.slice(0, 180) : err);
  }
}

const tables = await prisma.$queryRawUnsafe("SHOW TABLES LIKE 'sft_%'");
console.log("tables:", tables);
await prisma.$disconnect();
