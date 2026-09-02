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
