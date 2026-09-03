import { createHash, randomUUID } from "node:crypto";

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

export async function importExternalProductImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
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
