import "dotenv/config";

import { prisma } from "../src/server/db";

// Temporary bulk-email test data: N passwordless customers on Resend's simulator addresses (delivered+label@resend.dev), so no real inbox is mailed.
// Usage: npm run marketing:test-customers -- --count 150   |   --remove
// Any other database (e.g. Railway `zambiel`) needs its exact name: --allow-database zambiel
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
const allowArgIndex = process.argv.indexOf("--allow-database");
const allowedDatabase = allowArgIndex === -1 ? undefined : process.argv[allowArgIndex + 1];
if (!["zambiel_dev", "zambiel_test"].includes(databaseName) && databaseName !== allowedDatabase) {
  throw new Error("Refused: DATABASE_URL must target lowercase zambiel_dev or zambiel_test, or pass --allow-database <exact name>.");
}

const emailPrefix = "delivered+zambiel-mkt-";
const firstNames = ["Anna", "Luca", "Mia", "Noah", "Lea", "Elias", "Lina", "Leon", "Emma", "Matteo", "Sofia", "Jonas", "Laura", "Nico", "Sara", "David", "Nina", "Samuel", "Julia", "Tim"];
const lastNames = ["Müller", "Meier", "Schmid", "Keller", "Weber", "Huber", "Schneider", "Meyer", "Steiner", "Fischer", "Gerber", "Brunner", "Baumann", "Frei", "Zimmermann"];

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--remove")) {
    const users = await prisma.user.findMany({ where: { email: { startsWith: emailPrefix } }, select: { id: true } });
    // Campaign recipient rows keep their email snapshot; the user link is set to NULL by the foreign key.
    const { count } = await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) }, role: "CUSTOMER", orders: { none: {} } } });
    console.log(`Removed ${count} marketing test customers from ${databaseName}.`);
    return;
  }
  const countArg = Number(args[args.indexOf("--count") + 1]);
  const count = args.includes("--count") ? countArg : 150;
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error("--count must be an integer from 1 to 1000.");
  const data = Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(4, "0");
    // Every 10th record has no name, to exercise the {{name}} fallback.
    const name = index % 10 === 9 ? null : `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
    return { email: `${emailPrefix}${number}@resend.dev`, name, role: "CUSTOMER" as const };
  });
  const { count: created } = await prisma.user.createMany({ data, skipDuplicates: true });
  console.log(`Created ${created} marketing test customers (${count - created} already existed) in ${databaseName}.`);
}

main().finally(() => prisma.$disconnect());
