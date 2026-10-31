import { Resend } from "resend";

import { getEmailEnv } from "@/config/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

let resend: Resend | undefined;

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("EMAIL_NOT_CONFIGURED");
  }
}

export type BatchEmailMessage = EmailMessage & { headers?: Record<string, string>; scheduledAt?: string };
function client() {
  const env = getEmailEnv();
  if (env.RESEND_API_KEY === "re_placeholder") throw new EmailNotConfiguredError();
  resend ??= new Resend(env.RESEND_API_KEY);
  return { resend, from: env.EMAIL_FROM };
}

// Up to 100 separate emails (one recipient each) per call; strict validation keeps returned ids index-aligned with the input.
export async function sendEmailBatch(messages: BatchEmailMessage[], idempotencyKey: string): Promise<string[]> {
  const { resend, from } = client();
  const result = await resend.batch.send(messages.map((message) => ({ from, ...message })), { idempotencyKey });
  if (result.error) throw new Error(result.error.message);
  return result.data.data.map((email) => email.id);
}

export async function cancelScheduledEmail(id: string) {
  const result = await client().resend.emails.cancel(id);
  if (result.error) throw new Error(result.error.message);
}

export async function sendEmail(message: EmailMessage) {
  const env = getEmailEnv();

  if (env.RESEND_API_KEY === "re_placeholder") {
    throw new EmailNotConfiguredError();
  }

  resend ??= new Resend(env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    ...message,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
