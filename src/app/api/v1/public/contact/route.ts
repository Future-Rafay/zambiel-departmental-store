import { ZodError } from "zod";

import { sendEmail } from "@/server/email/client";
import {
  contactAcknowledgementEmail,
  contactInquiryEmail,
} from "@/server/email/templates";
import { assertSameOrigin } from "@/server/http";
import { getRuntimeStoreConfig } from "@/server/services/store-config";
import { contactSchema } from "@/server/validators/contact";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = contactSchema.parse(await request.json());
    const recipient = (await getRuntimeStoreConfig()).contact.email;
    if (!recipient) {
      return Response.json({ error: "CONTACT_UNAVAILABLE" }, { status: 503 });
    }

    await sendEmail({
      to: recipient,
      replyTo: input.email,
      ...contactInquiryEmail(input),
    });
    let acknowledgementSent = true;
    try {
      await sendEmail({ to: input.email, ...contactAcknowledgementEmail(input) });
    } catch (error) {
      acknowledgementSent = false;
      console.warn(
        "Contact inquiry delivered but acknowledgement failed:",
        error instanceof Error ? error.message : "Unknown email error",
      );
    }
    return Response.json({ sent: true, acknowledgementSent });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_ORIGIN") {
      return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
    }
    console.warn(
      "Contact email delivery failed:",
      error instanceof Error ? error.message : "Unknown email error",
    );
    return Response.json({ error: "EMAIL_DELIVERY_FAILED" }, { status: 502 });
  }
}
