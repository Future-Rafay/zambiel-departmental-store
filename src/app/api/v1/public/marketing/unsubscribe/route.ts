import { unsubscribeMarketing } from "@/server/services/marketing-campaigns";

// Serves both RFC 8058 one-click POSTs from mail providers and the confirmation form on the unsubscribe page; the signed token is the credential.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const token = url.searchParams.get("token") ?? String(form?.get("token") ?? "");
  const locale = form?.get("locale") === "en" ? "en" : form?.get("locale") === "de" ? "de" : null;
  const valid = token.length <= 300 && (await unsubscribeMarketing(token).catch(() => false));
  if (locale) return Response.redirect(new URL(`/${locale}/marketing/unsubscribe?${valid ? "done=1" : "invalid=1"}`, url), 303);
  return Response.json({ unsubscribed: valid }, { status: valid ? 200 : 400 });
}