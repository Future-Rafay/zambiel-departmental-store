import { z, ZodError } from "zod";

import { assertSameOrigin } from "@/server/http";
import { unsubscribeNewsletter } from "@/server/services/newsletter";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = z.string().min(32).max(256).parse((await request.json()).token);
    return Response.json({ unsubscribed: await unsubscribeNewsletter(token) });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_ORIGIN") return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
    return Response.json({ error: "UNSUBSCRIBE_FAILED" }, { status: 500 });
  }
}
