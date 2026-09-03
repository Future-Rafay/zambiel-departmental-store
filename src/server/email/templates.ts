import { storeConfig } from "@/config/store";
import type { ContactInput } from "@/server/validators/contact";

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
  locale?: "de" | "en";
  eyebrow: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  const locale = input.locale ?? "en";
  const { colors, fonts } = storeConfig.brand;
  const name = escapeHtml(storeConfig.identity.name);
  const displayFont = `${escapeHtml(fonts.display)}, Arial, sans-serif`;
  const bodyFont = `${escapeHtml(fonts.body)}, Arial, sans-serif`;
  const action = input.action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td bgcolor="${colors.primary}" style="border-radius:4px"><a href="${escapeHtml(input.action.href)}" style="display:inline-block;border:1px solid ${colors.primary};border-radius:4px;background:${colors.primary};color:${colors.surface};padding:16px 24px;text-decoration:none;font-family:${displayFont};font-weight:700">${escapeHtml(input.action.label)}</a></td></tr></table><p style="font-size:12px;color:${colors.muted};word-break:break-all">${locale === "de" ? "Falls der Button nicht funktioniert:" : "If the button does not work:"}<br><a href="${escapeHtml(input.action.href)}" style="color:${colors.primary}">${escapeHtml(input.action.href)}</a></p>`
    : "";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;padding:0;background:${colors.background};color:${colors.foreground};font-family:${bodyFont};-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(input.eyebrow)} — ${escapeHtml(input.title)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colors.background}"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid ${colors.border};background:${colors.surface}"><tr><td bgcolor="${colors.primary}" style="padding:28px 28px 24px;border-bottom:4px solid ${colors.accent};color:${colors.surface}"><p style="margin:0;font-family:${displayFont};font-size:32px;line-height:1.2;font-weight:800;letter-spacing:-1px">${name}</p><p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:${colors.surface}">${escapeHtml(storeConfig.identity.tagline[locale])}</p></td></tr><tr><td style="padding:28px;font-size:16px;line-height:1.75;overflow-wrap:anywhere"><p style="margin:0 0 12px;color:${colors.primary};font-family:${displayFont};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p><h1 style="margin:0 0 24px;font-family:${displayFont};font-size:28px;line-height:1.25;font-weight:750;letter-spacing:-0.5px;color:${colors.primary}">${escapeHtml(input.title)}</h1>${input.body}${action}</td></tr><tr><td style="padding:20px 28px;border-top:1px solid ${colors.border};background:${colors.background};font-size:12px;line-height:1.7;color:${colors.muted}"><strong style="font-family:${displayFont};color:${colors.primary}">${name}</strong><br>${escapeHtml(storeConfig.footer.text[locale])}<br>${locale === "de" ? "Automatisch versendete Nachricht" : "Automated email"}</td></tr></table></td></tr></table></body></html>`;
}

export function contactInquiryEmail(input: ContactInput) {
  const requestLabel = input.kind === "product_request" ? "Product request" : "Contact inquiry";
  const subject = input.subject || requestLabel;
  const details = [
    `<p><strong>Name:</strong> ${escapeHtml(input.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(input.email)}</p>`,
    input.phone ? `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>` : "",
    `<p><strong>Message:</strong></p><p>${escapeHtml(input.message).replaceAll("\n", "<br>")}</p>`,
  ].join("");
  return {
    subject: `${storeConfig.identity.name}: ${subject}`,
    text: `${requestLabel}\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || "-"}\n\n${input.message}`,
    html: brandedEmail({ locale: input.locale, eyebrow: requestLabel, title: subject, body: details }),
  };
}

export function contactAcknowledgementEmail(input: ContactInput) {
  const de = input.locale === "de";
  return {
    subject: de ? "Wir haben Ihre Nachricht erhalten" : "We received your message",
    text: de
      ? `Hallo ${input.name}, wir haben Ihre Nachricht erhalten und melden uns so bald wie möglich.`
      : `Hello ${input.name}, we received your message and will reply as soon as possible.`,
    html: brandedEmail({
      locale: input.locale,
      eyebrow: de ? "Nachricht erhalten" : "Message received",
      title: de ? `Danke, ${input.name}` : `Thank you, ${input.name}`,
      body: de
        ? "<p>Wir haben Ihre Nachricht erhalten und melden uns so bald wie möglich.</p>"
        : "<p>We received your message and will reply as soon as possible.</p>",
    }),
  };
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

export function newsletterWelcomeEmail(input: { locale: "de" | "en"; unsubscribeUrl: string }) {
  const de = input.locale === "de";
  return {
    subject: de ? `Willkommen bei ${storeConfig.identity.name}` : `Welcome to ${storeConfig.identity.name}`,
    text: de
      ? `Sie erhalten jetzt Neuigkeiten von ${storeConfig.identity.name}. Abmelden: ${input.unsubscribeUrl}`
      : `You are now subscribed to ${storeConfig.identity.name} updates. Unsubscribe: ${input.unsubscribeUrl}`,
    html: brandedEmail({
      locale: input.locale,
      eyebrow: de ? "Newsletter" : "Newsletter",
      title: de ? "Schön, dass Sie dabei sind" : "Glad to have you with us",
      body: de
        ? `<p>Sie erhalten jetzt Neuigkeiten und Angebote von ${storeConfig.identity.name}.</p><p><a href="${escapeHtml(input.unsubscribeUrl)}">Newsletter abbestellen</a></p>`
        : `<p>You will now receive news and offers from ${storeConfig.identity.name}.</p><p><a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe from these emails</a></p>`,
    }),
  };
}

export function passwordResetEmail(input: { locale: "de" | "en"; resetUrl: string }) {
  const de = input.locale === "de";
  return {
    subject: de ? "Passwort zurücksetzen" : "Reset your password",
    text: de
      ? `Setzen Sie Ihr Passwort innerhalb einer Stunde zurück: ${input.resetUrl}`
      : `Reset your password within one hour: ${input.resetUrl}`,
    html: brandedEmail({
      locale: input.locale,
      eyebrow: de ? "Kontosicherheit" : "Account security",
      title: de ? "Passwort zurücksetzen" : "Reset your password",
      body: de
        ? "<p>Dieser sichere Link ist eine Stunde gültig. Falls Sie die Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>"
        : "<p>This secure link is valid for one hour. If you did not request it, you can ignore this email.</p>",
      action: { href: input.resetUrl, label: de ? "Neues Passwort wählen" : "Choose a new password" },
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
      locale: input.locale === "DE" ? "de" : "en",
      eyebrow: input.locale === "DE" ? "Bestellstatus" : "Order status",
      title: subject,
      body: `<p>${body}</p>`,
    }),
  };
}
