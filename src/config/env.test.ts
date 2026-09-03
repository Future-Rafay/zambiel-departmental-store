import assert from "node:assert/strict";
import test from "node:test";

import { assertProductionEnvironment } from "@/config/env";

const valid = {
  DATABASE_URL: "mysql://app:secret@db.example.com:3306/zambiel?sslaccept=strict",
  DATABASE_SSL: "true",
  AUTH_SECRET: "a-production-secret-with-32-characters",
  NEXTAUTH_URL: "https://zambiel.example",
  GOOGLE_CLIENT_ID: "client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-secret",
  AWS_REGION: "eu-central-1",
  AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "aws-secret",
  S3_BUCKET_NAME: "zambiel-production",
  S3_PUBLIC_BASE_URL: "https://assets.zambiel.example",
  RESEND_API_KEY: "re_live_example",
  EMAIL_FROM: "Zambiel <no-reply@zambiel.example>",
  APP_URL: "https://zambiel.example",
  STRIPE_SECRET_KEY: "sk_live_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
};

test("production environment accepts managed TLS configuration with the resilient pool default", () => {
  const environment = assertProductionEnvironment(valid);
  assert.equal(environment.DATABASE_SSL, true);
  assert.equal(environment.DATABASE_CONNECTION_LIMIT, 10);
});

test("production environment rejects local, placeholder, and test payment values", () => {
  assert.throws(() => assertProductionEnvironment({ ...valid, CONTACT_EMAIL_TO_DEV: "test@example.com" }));
  assert.throws(() => assertProductionEnvironment({
    ...valid,
    DATABASE_URL: "mysql://zambiel:change-me@127.0.0.1:3306/zambiel_dev",
    DATABASE_SSL: "false",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
  }));
});
