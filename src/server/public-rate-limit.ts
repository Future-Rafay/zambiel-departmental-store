import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { getRateLimitSecret } from "@/config/env";
import { prisma } from "@/server/db";

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export function hashRateLimitIdentifier(scope: "ip" | "email", identifier: string, secret = getRateLimitSecret()) {
  return `${scope}:${createHmac("sha256", secret).update(identifier.trim().toLowerCase()).digest("hex")}`;
}

export function getForwardedClientIp(headers: Headers) {
  const value = headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for") || headers.get("x-real-ip");
  const candidate = value?.split(",", 1)[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export async function pruneExpiredPublicRateLimits(now = new Date()) {
  await prisma.publicRequestRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86_400_000) } } });
}

export async function consumePublicRateLimit(input: {
  scope: "ip" | "email";
  identifier: string;
  limit: number;
  windowMs: number;
  now?: Date;
}): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + input.windowMs);
  const key = hashRateLimitIdentifier(input.scope, input.identifier);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO publicrequestratelimit (\`key\`, \`count\`, \`windowStartedAt\`, \`expiresAt\`, \`updatedAt\`)
      VALUES (${key}, LAST_INSERT_ID(1), ${now}, ${expiresAt}, ${now})
      ON DUPLICATE KEY UPDATE
        \`count\` = LAST_INSERT_ID(IF(\`expiresAt\` <= ${now}, 1, \`count\` + 1)),
        \`windowStartedAt\` = IF(\`expiresAt\` <= ${now}, ${now}, \`windowStartedAt\`),
        \`expiresAt\` = IF(\`expiresAt\` <= ${now}, ${expiresAt}, \`expiresAt\`),
        \`updatedAt\` = ${now}
    `;
    const [{ count }] = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT LAST_INSERT_ID() AS count`;
    const row = await tx.publicRequestRateLimit.findUniqueOrThrow({ where: { key }, select: { expiresAt: true } });
    const used = Number(count);
    return used <= input.limit
      ? { allowed: true as const, remaining: input.limit - used }
      : { allowed: false as const, retryAfterSeconds: Math.max(1, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000)) };
  });
}
