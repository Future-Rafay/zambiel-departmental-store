import { storeConfig } from "@/config/store";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ]!,
  );
}
function brandedEmail(input: {
  eyebrow: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  const action = input.action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.action.href)}" style="display:inline-block;border-radius:10px;background:${storeConfig.brand.colors.primary};color:#fff;padding:13px 20px;text-decoration:none;font-weight:700">${escapeHtml(input.action.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f3ef;color:#17251f;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #d8ddd9;border-radius:18px;background:#fff;overflow:hidden"><tr><td style="padding:26px 32px;border-bottom:4px solid ${storeConfig.brand.colors.accent};font-size:28px;font-weight:900">${storeConfig.identity.name}</td></tr><tr><td style="padding:32px"><p style="color:${storeConfig.brand.colors.primary};font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p><h1>${escapeHtml(input.title)}</h1>${input.body}${action}<p style="margin-top:30px;border-top:1px solid #d8ddd9;padding-top:18px;color:#66736d;font-size:12px">${storeConfig.identity.name} · Automated service message</p></td></tr></table></td></tr></table></body></html>`;
}
export function staffInvitationEmail(input: { invitationUrl: string }) {
  return {
    subject: `You are invited to ${storeConfig.identity.name}`,
    text: `Set your staff password: ${input.invitationUrl}. This link expires in 48 hours.`,
    html: brandedEmail({
      eyebrow: "Staff invitation",
      title: `Welcome to ${storeConfig.identity.name}`,
      body: "<p>Create your staff password to access store operations. This secure link expires in 48 hours.</p>",
      action: { href: input.invitationUrl, label: "Accept invitation" },
    }),
  };
}
export function orderConfirmationEmail(input: { orderNumber: string }) {
  const number = escapeHtml(input.orderNumber);
  return {
    subject: `${storeConfig.identity.name} order ${input.orderNumber}`,
    text: `Your order ${input.orderNumber} is confirmed.`,
    html: brandedEmail({
      eyebrow: "Order confirmed",
      title: "We received your order",
      body: `<p>Your order <strong>${number}</strong> is confirmed. We will email you when its status changes.</p>`,
    }),
  };
}
export function orderStatusEmail(input: {
  orderNumber: string;
  status: string;
  locale: "DE" | "EN";
}) {
  const labels: Record<string, { DE: string; EN: string }> = {
    PROCESSING: { DE: "wird bearbeitet", EN: "is being processed" },
    READY_FOR_PICKUP: { DE: "ist abholbereit", EN: "is ready for pickup" },
    OUT_FOR_DELIVERY: { DE: "ist unterwegs", EN: "is out for delivery" },
    DELIVERED: { DE: "wurde geliefert", EN: "was delivered" },
    PICKED_UP: { DE: "wurde abgeholt", EN: "was picked up" },
    CANCELLED: { DE: "wurde storniert", EN: "was cancelled" },
  };
  const status =
    labels[input.status]?.[input.locale] ??
    input.status.replaceAll("_", " ").toLowerCase();
  const subject =
    input.locale === "DE"
      ? `Bestellung ${input.orderNumber}: ${status}`
      : `Order ${input.orderNumber}: ${status}`;
  const body =
    input.locale === "DE"
      ? `Ihre Bestellung <strong>${escapeHtml(input.orderNumber)}</strong> ${escapeHtml(status)}.`
      : `Your order <strong>${escapeHtml(input.orderNumber)}</strong> ${escapeHtml(status)}.`;
  return {
    subject,
    text: body.replace(/<[^>]+>/g, ""),
    html: brandedEmail({
      eyebrow: input.locale === "DE" ? "Bestellstatus" : "Order status",
      title: subject,
      body: `<p>${body}</p>`,
    }),
  };
}
