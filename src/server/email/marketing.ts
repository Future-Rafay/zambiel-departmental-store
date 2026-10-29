import { createHmac, timingSafeEqual } from "node:crypto";

import sanitizeHtml from "sanitize-html";

import { storeConfig } from "@/config/store";

export type MergeRecipient = { name: string | null; email: string };

const colorValue = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i];

export function sanitizeMarketingHtml(html: string, allowedImagePrefixes: readonly string[]) {
  const clean = sanitizeHtml(html, {
    allowedTags: ["p", "br", "h1", "h2", "h3", "ul", "ol", "li", "strong", "em", "s", "u", "blockquote", "hr", "a", "img", "span"],
    allowedAttributes: { a: ["href"], img: ["src", "alt"], span: ["style"] },
    allowedStyles: { span: { color: colorValue } },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      img: (_tagName, attributes) => allowedImagePrefixes.some((prefix) => attributes.src?.startsWith(prefix))
        ? { tagName: "img", attribs: { src: attributes.src, alt: attributes.alt ?? "" } }
        : { tagName: "span", attribs: {} as Record<string, string> },
    },
  }).trim();
  return inlineEmailStyles(clean);
}

// Email clients ignore stylesheets, so the sanitized tags (which carry no attributes except a/img/span) get inline styles.
function inlineEmailStyles(html: string) {
  const { colors, fonts } = storeConfig.brand;
  const display = `${fonts.display}, Arial, sans-serif`;
  const heading = (size: number) => `margin:24px 0 12px;font-family:${display};font-size:${size}px;line-height:1.25;font-weight:750;color:${colors.primary}`;
  return html
    .replaceAll("<h1>", `<h1 style="${heading(28)}">`)
    .replaceAll("<h2>", `<h2 style="${heading(22)}">`)
    .replaceAll("<h3>", `<h3 style="${heading(18)}">`)
    .replaceAll("<p>", '<p style="margin:0 0 16px">')
    .replaceAll("<blockquote>", `<blockquote style="margin:0 0 16px;padding-left:16px;border-left:4px solid ${colors.accent}">`)
    .replaceAll("<hr />", `<hr style="border:0;border-top:1px solid ${colors.border};margin:24px 0" />`)
    .replaceAll("<a ", `<a style="color:${colors.primary}" `)
    .replaceAll("<img ", '<img style="display:block;max-width:100%;height:auto;border:0;margin:0 0 16px" width="544" ');
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

export function mergeValues(recipient: MergeRecipient, locale: "de" | "en") {
  const name = recipient.name?.trim() || (locale === "de" ? "Kundin, Kunde" : "customer");
  return { "{{name}}": name, "{{first_name}}": recipient.name?.trim().split(/\s+/)[0] || name, "{{email}}": recipient.email };
}

export function applyMergeFields(template: string, recipient: MergeRecipient, locale: "de" | "en", escape: boolean) {
  const values = mergeValues(recipient, locale);
  return template.replace(/\{\{(name|first_name|email)\}\}/g, (field) => (escape ? escapeHtml(values[field as keyof typeof values]) : values[field as keyof typeof values]));
}

export function htmlToText(html: string) {
  return sanitizeHtml(html.replace(/<\/(p|h[1-3]|li|blockquote)>|<br\s*\/?>/gi, "\n"), { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

const sign = (userId: string, secret: string) => createHmac("sha256", secret).update(`marketing-unsubscribe:${userId}`).digest("base64url");

export function marketingUnsubscribeToken(userId: string, secret: string) {
  return `${userId}.${sign(userId, secret)}`;
}

export function verifyMarketingUnsubscribeToken(token: string, secret: string) {
  const [userId, signature] = token.split(".");
  if (!userId || !signature) return null;
  const expected = Buffer.from(sign(userId, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? userId : null;
}

export const marketingStarterTemplateKeys = ["blank", "announcement", "promotion"] as const;
export type MarketingStarterTemplate = (typeof marketingStarterTemplateKeys)[number];

export function marketingStarterTemplate(key: MarketingStarterTemplate, shopUrl: string) {
  const name = escapeHtml(storeConfig.identity.name);
  return {
    blank: { label: "Blank", subject: "", html: "<p>Dear {{name}},</p><p></p>" },
    announcement: { label: "Announcement", subject: `News from ${storeConfig.identity.name}`, html: `<h1>Something new at ${name}</h1><p>Dear {{name}},</p><p>Write your announcement here.</p><p>Kind regards,<br>Your ${name} team</p>` },
    promotion: { label: "Promotion", subject: "A special offer for you, {{first_name}}", html: `<h1>This week only</h1><p>Dear {{name}},</p><p>Describe the offer, its conditions, and when it ends.</p><h2>Featured products</h2><ul><li>Product one</li><li>Product two</li></ul><p><a href="${escapeHtml(shopUrl)}">Shop now</a></p>` },
  }[key];
}