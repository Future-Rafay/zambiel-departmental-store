import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Components must use theme tokens (src/config/theme.ts), not hardcoded design values.
const banned: Array<[string, RegExp]> = [
  ["fixed radius", /\brounded(-(?:t|b|l|r|s|e|tl|tr|bl|br))?(-(?:none|xs|sm|md|lg|xl|2xl|3xl|4xl|\[[^\]]+\]))?(?![\w-])/g],
  ["full radius", /\brounded(-(?:t|b|l|r|s|e))?-full\b/g],
  ["palette colour", /\b(?:bg|text|border|ring|from|to|via|divide|outline|fill|stroke|placeholder|accent|shadow|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/g],
  ["arbitrary colour", /-\[(?:#|rgba?\(|hsla?\()[^\]]*\]/g],
  ["arbitrary shadow", /\bshadow-\[[^\]]+\]/g],
  ["arbitrary font size", /\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/g],
];

// file → tokens allowed there when the line also contains `on`, with the reason. This is also the "not converted" list.
const allowed: Record<string, Array<{ match: string; on: string; why: string }>> = {
  "src/components/admin/admin-queue.tsx": [
    { match: "rounded-full", on: "animate-ping", why: "pulsing live-status dot is a true circle" },
    { match: "rounded-full", on: "h-2 w-2", why: "live-status dot is a true circle" },
  ],
  "src/components/site/hero-showcase.tsx": [{ match: "rounded-full", on: "size-3", why: "carousel position dots are true circles" }],
  "src/components/site/order-tracker.tsx": [{ match: "rounded-full", on: "size-3", why: "timeline step dot is a true circle" }],
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".tsx") && !file.includes("generated"))
    .map((file) => join(dir, file).replaceAll("\\", "/"));
}

test("components use theme tokens instead of hardcoded design values", () => {
  const problems: string[] = [];
  for (const file of sourceFiles("src")) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const [label, pattern] of banned) {
        for (const found of line.matchAll(pattern)) {
          if (allowed[file]?.some((entry) => entry.match === found[0] && line.includes(entry.on))) continue;
          problems.push(`${file}:${index + 1} ${label}: ${found[0]}`);
        }
      }
    });
  }
  assert.deepEqual(problems, [], `Use theme tokens instead:\n${problems.join("\n")}`);
});
