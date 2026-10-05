import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { getS3Env } from "@/config/env";
import { storeConfig } from "@/config/store";

const uploadInputSchema = z.object({
  contentType: z.enum(["image/avif", "image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  scope: z.enum(["brand", "products"]),
});

const extensions = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

let client: S3Client | undefined;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

function getS3Client() {
  if (!client) {
    const env = getS3Env();
    client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return client;
}

export async function createImageUploadUrl(
  input: z.input<typeof uploadInputSchema>,
) {
  const values = uploadInputSchema.parse(input);
  const env = getS3Env();
  const key = `uploads/${storeConfig.identity.storagePrefix}/${values.scope}/${randomUUID()}.${extensions[values.contentType]}`;
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: values.contentType,
    ContentLength: values.size,
  });

  return {
    key,
    publicUrl: `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`,
    uploadUrl: await getSignedUrl(getS3Client(), command, { expiresIn: 300 }),
  };
}

export function isPrivateNetworkAddress(value: string) {
  const address = value.toLowerCase().split("%", 1)[0];
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (isIP(address) === 6) {
    if (address.startsWith("::ffff:")) {
      return isPrivateNetworkAddress(address.slice("::ffff:".length));
    }
    return (
      address === "::" ||
      address === "::1" ||
      address.startsWith("fc") ||
      address.startsWith("fd") ||
      /^fe[89ab]/.test(address) ||
      address.startsWith("ff") ||
      address.startsWith("2001:db8:")
    );
  }
  return true;
}

export function parseExternalImageUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Image URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.port) {
    throw new Error("Image URL credentials and custom ports are not allowed");
  }
  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Private image hosts are not allowed");
  }
  if (isIP(hostname) && isPrivateNetworkAddress(hostname)) {
    throw new Error("Private image hosts are not allowed");
  }
  return url;
}

async function assertPublicImageUrl(value: string | URL) {
  const url = parseExternalImageUrl(value.toString());
  if (!isIP(url.hostname)) {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateNetworkAddress(address))) {
      throw new Error("Private image hosts are not allowed");
    }
  }
  return url;
}

async function fetchExternalImage(value: string) {
  let url = await assertPublicImageUrl(value);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    if (!redirectStatuses.has(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || redirects === 3) {
      throw new Error("Image download redirected too many times");
    }
    await response.body?.cancel();
    url = await assertPublicImageUrl(new URL(location, url));
  }
  throw new Error("Image download redirected too many times");
}

function matchesImageSignature(body: Buffer, contentType: keyof typeof extensions) {
  if (contentType === "image/jpeg") return body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  if (contentType === "image/png") return body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp") return body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP";
  return body.subarray(4, 12).toString("ascii").startsWith("ftyp") && /avi[fs]/.test(body.subarray(8, 32).toString("ascii"));
}

export async function importExternalProductImage(url: string) {
  const response = await fetchExternalImage(url);
  if (!response.ok)
    throw new Error(`Image download failed (${response.status})`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0] as
    | keyof typeof extensions
    | undefined;
  if (!contentType || !(contentType in extensions))
    throw new Error(`Unsupported image type: ${contentType ?? "missing"}`);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > 10 * 1024 * 1024) throw new Error("Image exceeds 10 MB");
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length || body.length > 10 * 1024 * 1024)
    throw new Error("Image size is invalid");
  if (!matchesImageSignature(body, contentType)) {
    throw new Error("Image content does not match its declared type");
  }
  const contentHash = createHash("sha256").update(body).digest("hex");
  const key = `uploads/${storeConfig.identity.storagePrefix}/products/import/${contentHash}.${extensions[contentType]}`;
  const env = getS3Env();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return {
    key,
    contentHash,
    publicUrl: `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`,
  };
}

export function resolvePublicImageUrl(key: string | null | undefined) {
  if (!key) return null;
  if (/^https?:\/\//i.test(key) || key.startsWith("/")) return key;
  return `${getS3Env().S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

export function getProductUploadPublicPrefix() {
  return `${getS3Env().S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/uploads/${storeConfig.identity.storagePrefix}/products/`;
}

export function resolveProductMediaUrl(media: {
  sourceUrl?: string | null;
  objectKey?: string | null;
}) {
  return resolvePublicImageUrl(media.sourceUrl || media.objectKey);
}
