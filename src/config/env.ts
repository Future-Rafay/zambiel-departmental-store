import { z } from "zod";

const databaseSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("mysql://"),
  DATABASE_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(10).default(10),
  DATABASE_SSL: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  DATABASE_SSL_CA_BASE64: z.string().min(1).optional(),
});

const authSchema = z.object({
  AUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

const s3Schema = z.object({
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
});

const emailSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  APP_URL: z.string().url(),
});

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  APP_URL: z.string().url(),
});

const productionSchema = databaseSchema
  .and(authSchema)
  .and(s3Schema)
  .and(emailSchema)
  .and(stripeSchema)
  .superRefine((values, context) => {
    const placeholders = Object.entries(values).filter(
      ([, value]) => typeof value === "string" && /change-me|placeholder|replace-with/i.test(value),
    );
    for (const [path] of placeholders) {
      context.addIssue({ code: "custom", path: [path], message: "Production values cannot be placeholders." });
    }

    const databaseUrl = new URL(values.DATABASE_URL);
    if (["127.0.0.1", "localhost"].includes(databaseUrl.hostname) || /zambiel_(dev|test)/i.test(databaseUrl.pathname)) {
      context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Production must use its dedicated managed database." });
    }
    if (!values.DATABASE_SSL || databaseUrl.searchParams.get("sslaccept") !== "strict") {
      context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Production database TLS must use sslaccept=strict." });
    }

    const appUrl = new URL(values.APP_URL);
    const authUrl = new URL(values.NEXTAUTH_URL);
    if (appUrl.protocol !== "https:" || authUrl.protocol !== "https:" || appUrl.origin !== authUrl.origin) {
      context.addIssue({ code: "custom", path: ["APP_URL"], message: "APP_URL and NEXTAUTH_URL must be the same HTTPS origin." });
    }
    if (!values.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      context.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "Production requires a Stripe live-mode key." });
    }
    if (values.AUTH_SECRET.length < 32) {
      context.addIssue({ code: "custom", path: ["AUTH_SECRET"], message: "Production AUTH_SECRET must be at least 32 characters." });
    }
    if (new URL(values.S3_PUBLIC_BASE_URL).protocol !== "https:") {
      context.addIssue({ code: "custom", path: ["S3_PUBLIC_BASE_URL"], message: "Production S3 assets must use HTTPS." });
    }
  });

export function assertProductionEnvironment(input: Record<string, string | undefined> = process.env) {
  return productionSchema.parse(input);
}

export function getDatabaseEnv() {
  return databaseSchema.parse(process.env);
}

export function getAuthEnv() {
  return authSchema.parse(process.env);
}

export function getS3Env() {
  return s3Schema.parse(process.env);
}

export function getEmailEnv() {
  return emailSchema.parse(process.env);
}

export function getStripeEnv() {
  return stripeSchema.parse(process.env);
}

export function getStaffApkUrl() {
  return z.string().url().optional().parse(process.env.STAFF_APK_URL || undefined);
}
