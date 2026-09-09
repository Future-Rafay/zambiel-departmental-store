import "dotenv/config";
import { spawnSync } from "node:child_process";

// This runner never creates, resets, drops, or seeds a database.
// Supply an existing empty/migrated local zambiel_test database explicitly.
const target = process.env.TEST_DATABASE_URL;
if (!target)
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated local zambiel_test database.",
  );
const url = new URL(target);
if (
  url.protocol !== "mysql:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/zambiel_test"
) {
  throw new Error("Refusing integration writes outside local zambiel_test.");
}
if (target === process.env.DATABASE_URL)
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");

function run(args: string[], env = process.env) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}

run(["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  ...process.env,
  DATABASE_URL: target,
});
run(["--import", "tsx", "--test", "--test-concurrency=1", "src/**/*.test.ts"], {
  ...process.env,
  TEST_DATABASE_URL: target,
  RESEND_API_KEY: "re_placeholder",
});
