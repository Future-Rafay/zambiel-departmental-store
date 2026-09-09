import {
  dispatchMobilePush,
  isPushDispatcherAuthorized,
} from "@/server/services/mobile-push";

export const runtime = "nodejs";
async function dispatch(request: Request) {
  if (!isPushDispatcherAuthorized(request.headers.get("authorization")))
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  return Response.json(await dispatchMobilePush(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = dispatch;
export const POST = dispatch;
