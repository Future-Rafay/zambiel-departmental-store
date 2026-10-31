import { createHmac, timingSafeEqual } from "node:crypto";
import { resolve4, resolve6, resolveMx } from "node:dns/promises";

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

// RFC 2606/6761 reserved domains never receive mail; Resend rejects the whole batch if one appears.
export function isUndeliverableEmail(email: string) {
  const domain = email.split("@").pop()?.toLowerCase() ?? "";
  return /(^|\.)(test|example|invalid|localhost)$/.test(domain) || /(^|\.)example\.(com|net|org)$/.test(domain);
}

// A domain with no MX/A/AAAA record (e.g. a not-yet-live zambiel.ch) is rejected by Resend and fails the whole batch.
// Only "no such domain/record" counts as undeliverable; timeouts or offline DNS let the address through.
export async function domainAcceptsMail(domain: string) {
  for (const lookup of [resolveMx, resolve4, resolve6]) {
    try {
      if ((await lookup(domain)).length) return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOTFOUND" && code !== "ENODATA") return true;
    }
  }
  return false;
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

export const marketingStarterTemplateKeys = ["blank", "announcement", "promotion", "newArrivals", "seasonalSale", "backInStock", "newsletter", "thankYou"] as const;
export type MarketingStarterTemplate = (typeof marketingStarterTemplateKeys)[number];

export function marketingStarterTemplate(key: MarketingStarterTemplate, shopUrl: string) {
  const name = escapeHtml(storeConfig.identity.name);
  return {
    blank: { label: "Blank", subject: "", html: "<p>Dear {{name}},</p><p></p>" },
    announcement: { label: "Announcement", subject: `News from ${storeConfig.identity.name}`, html: `<h1>Something new at ${name}</h1><p>Dear {{name}},</p><p>Write your announcement here.</p><p>Kind regards,<br>Your ${name} team</p>` },
    promotion: { label: "Promotion", subject: "A special offer for you, {{first_name}}", html: `<h1>This week only</h1><p>Dear {{name}},</p><p>Describe the offer, its conditions, and when it ends.</p><h2>Featured products</h2><ul><li>Product one</li><li>Product two</li></ul><p><a href="${escapeHtml(shopUrl)}">Shop now</a></p>` },
    newArrivals: { label: "New arrivals", subject: `Just arrived at ${storeConfig.identity.name}`, html: `<h1>New in store</h1><p>Dear {{name}},</p><p>Introduce the new products and what makes them worth a look.</p><h2>Now available</h2><ul><li>New product one</li><li>New product two</li><li>New product three</li></ul><p><a href="${escapeHtml(shopUrl)}">Discover the new arrivals</a></p><p>Kind regards,<br>Your ${name} team</p>` },
    seasonalSale: { label: "Seasonal sale", subject: "Our seasonal sale has started, {{first_name}}", html: `<h1>Seasonal sale</h1><p>Dear {{name}},</p><p>Describe the sale: which products are included, the discount, and the exact start and end dates.</p><h2>Highlights</h2><ul><li>Highlight one</li><li>Highlight two</li></ul><p><a href="${escapeHtml(shopUrl)}">Shop the sale</a></p><p>Conditions: add the terms of the offer here.</p>` },
    backInStock: { label: "Back in stock", subject: `Back in stock at ${storeConfig.identity.name}`, html: `<h1>It's back</h1><p>Dear {{name}},</p><p>Popular products are available again. Name them here and mention if quantities are limited.</p><ul><li>Product one</li><li>Product two</li></ul><p><a href="${escapeHtml(shopUrl)}">Order now</a></p>` },
    newsletter: { label: "Newsletter", subject: `${storeConfig.identity.name} news for you, {{first_name}}`, html: `<h1>${name} newsletter</h1><p>Dear {{name}},</p><p>A short introduction to this edition.</p><h2>What's new</h2><p>Share store news, new products, or useful tips.</p><h2>Recommended for you</h2><ul><li>Recommendation one</li><li>Recommendation two</li></ul><p><a href="${escapeHtml(shopUrl)}">Visit the shop</a></p><p>Kind regards,<br>Your ${name} team</p>` },
    thankYou: { label: "Thank you", subject: "Thank you, {{first_name}}", html: `<h1>Thank you</h1><p>Dear {{name}},</p><p>Thank your customers for their trust and support. Mention anything you would like them to know next.</p><p><a href="${escapeHtml(shopUrl)}">Visit ${name}</a></p><p>Warm regards,<br>Your ${name} team</p>` },
  }[key];
}