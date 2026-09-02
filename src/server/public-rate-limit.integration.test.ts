import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

test("database rate limits are atomic, scoped, and reset after expiry", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a migrated isolated database.");
    return;
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "2";
  process.env.DATABASE_SSL ??= "false";
  process.env.AUTH_SECRET ??= "rate-limit-integration-secret";

  const [{ prisma }, { consumePublicRateLimit, hashRateLimitIdentifier }] = await Promise.all([
    import("@/server/db"),
    import("@/server/public-rate-limit"),
  ]);
  const identifier = `rate-${crypto.randomUUID()}@example.com`;
  const key = hashRateLimitIdentifier("email", identifier);
  const now = new Date("2026-09-02T00:00:00.000Z");

  try {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => consumePublicRateLimit({ scope: "email", identifier, limit: 5, windowMs: 60_000, now })),
    );
    assert.equal(results.filter(({ allowed }) => allowed).length, 5);
    assert.equal(results.filter(({ allowed }) => !allowed).length, 1);
    assert.equal((await consumePublicRateLimit({ scope: "ip", identifier, limit: 1, windowMs: 60_000, now })).allowed, true);
    assert.equal((await consumePublicRateLimit({ scope: "email", identifier, limit: 5, windowMs: 60_000, now: new Date(now.getTime() + 60_001) })).allowed, true);
  } finally {
    await prisma.publicRequestRateLimit.deleteMany({ where: { key: { in: [key, hashRateLimitIdentifier("ip", identifier)] } } });
    await prisma.$disconnect();
  }
});
