import assert from "node:assert/strict";
import test from "node:test";

import { applyMergeFields, htmlToText, marketingStarterTemplate, marketingStarterTemplateKeys, marketingUnsubscribeToken, sanitizeMarketingHtml, verifyMarketingUnsubscribeToken } from "./marketing";
import { marketingEmail } from "./templates";

const prefix = "https://cdn.example.com/uploads/Zambiel/products/";

test("marketing HTML keeps design markup, inlines email styles, and strips unsafe content", () => {
  const html = sanitizeMarketingHtml(
    `<h1>Sale</h1><p onclick="x()"><span style="color: rgb(214, 168, 75); position: fixed">Gold</span> <a href="javascript:alert(1)">bad</a> <a href="https://zambiel.ch">ok</a></p><img src="${prefix}a.png" alt="A"><img src="https://evil.example/x.png"><script>alert(1)</script><style>p{}</style>`,
    [prefix],
  );
  assert.match(html, /<h1 style="[^"]*font-size:28px/);
  assert.match(html, /<span style="color:rgb\(214, 168, 75\)">Gold<\/span>/);
  assert.ok(!html.includes("position"));
  assert.ok(!html.includes("onclick") && !html.includes("javascript:") && !html.includes("<script") && !html.includes("<style"));
  assert.match(html, /<a style="color:#153B35" href="https:\/\/zambiel.ch">ok<\/a>/);
  assert.match(html, new RegExp(`<img style="[^"]*max-width:100%[^"]*" width="544" src="${prefix}a.png" alt="A" />`));
  assert.ok(!html.includes("evil.example"));
});

test("merge fields personalise each recipient and escape HTML", () => {
  const template = "<p>Dear {{name}} ({{first_name}}, {{email}})</p>";
  assert.equal(applyMergeFields(template, { name: "Anna <b>Müller</b>", email: "a@example.com" }, "de", true), "<p>Dear Anna &lt;b&gt;Müller&lt;/b&gt; (Anna, a@example.com)</p>");
  assert.equal(applyMergeFields("Hi {{first_name}}", { name: null, email: "x@example.com" }, "en", false), "Hi customer");
  assert.equal(applyMergeFields("{{name}}", { name: "  ", email: "x@example.com" }, "de", false), "Kundin, Kunde");
  assert.equal(applyMergeFields("{{unknown}}", { name: "A", email: "x@example.com" }, "en", true), "{{unknown}}");
});

test("unsubscribe tokens are bound to the user and secret", () => {
  const secret = "test-secret-at-least-16";
  const token = marketingUnsubscribeToken("user_1", secret);
  assert.equal(verifyMarketingUnsubscribeToken(token, secret), "user_1");
  assert.equal(verifyMarketingUnsubscribeToken(token, "other-secret-value-123"), null);
  assert.equal(verifyMarketingUnsubscribeToken(token.replace("user_1", "user_2"), secret), null);
  assert.equal(verifyMarketingUnsubscribeToken("garbage", secret), null);
});

test("marketing email uses the branded shell with an unsubscribe footer and plain-text fallback", () => {
  const email = marketingEmail({ locale: "de", subject: "Angebot", bodyHtml: "<p>Hallo</p>", unsubscribeUrl: "https://example.com/u?token=a&b=c" });
  assert.ok(email.includes('role="presentation"') && email.includes("max-width:600px"));
  assert.ok(email.includes("token=a&amp;b=c"));
  assert.ok(!email.includes("Automatisch versendete Nachricht"));
  assert.equal(htmlToText("<h1>Hi &amp; welcome</h1><p>Line one<br>Line two</p><ul><li>A</li></ul>"), "Hi & welcome\nLine one\nLine two\nA");
  for (const key of marketingStarterTemplateKeys) assert.ok(marketingStarterTemplate(key, "https://example.com/de").html.includes("{{name}}"));
});
