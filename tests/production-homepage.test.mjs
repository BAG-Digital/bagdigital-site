import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../privacy.html", import.meta.url), "utf8");

test("public homepage has crawlable, accurate canonical and plain BAGDigital identity", () => {
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="robots" content="index,follow/);
  assert.match(html, /rel="canonical" href="https:\/\/bagdigital\.tech\/"/);
  assert.match(html, /property="og:url" content="https:\/\/bagdigital\.tech\/"/);
  assert.match(html, /<title>BAGDigital \| Websites, Workflows &amp; Technology Support<\/title>|<title>BAGDigital \| Websites, Workflows & Technology Support<\/title>/);
  assert.match(html, /class="wordmark"[^>]*>BAGDigital<\/a>/);
  assert.doesNotMatch(html, /<svg[^>]*class="logo"|class="brand-mark"/);
});

test("sales-first navigation and service cards link to real on-page sections", () => {
  for (const section of ["top", "main", "services", "how", "about", "contact"]) {
    assert.match(html, new RegExp('id="' + section + '"'));
  }
  for (const href of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes('id="' + href[1] + '"'), "Unresolved on-page link: #" + href[1]);
  }
  assert.match(html, />Services<\/a>/);
  assert.match(html, />How it works<\/a>/);
  assert.match(html, />About<\/a>/);
  assert.match(html, /Let's talk/);
  assert.equal((html.match(/class="service service-/g) || []).length, 4);
  for (const label of ["Websites", "Workflows", "Integrations", "Support"]) {
    assert.ok(html.includes(label), "Missing service " + label);
  }
});

test("contact is a small native HTML form with accessible validation and explicit provider disclosure", () => {
  assert.match(html, /<form[^>]*class="contact-form"[^>]*method="post"[^>]*action="https:\/\/formspree\.io\/f\/xjygzpzk"/);
  assert.match(html, /name="name"[^>]*maxlength="100" required/);
  assert.match(html, /name="email" type="email"[^>]*maxlength="254" required/);
  assert.match(html, /name="business"[^>]*maxlength="150"/);
  assert.match(html, /name="interest" required/);
  assert.match(html, /name="message"[^>]*maxlength="3000"[^>]*required/);
  assert.match(html, /name="processing_ack"[^>]*required/);
  assert.match(html, /name="_gotcha"[^>]*tabindex="-1"/);
  assert.match(html, /name="subject" value="New BAGDigital website inquiry"/);
  assert.doesNotMatch(html, /formsubmit\\.co|name="_honey"|name="_template"|name="_subject"/i);
  assert.doesNotMatch(html, /name="_captcha"\s+value="false"/i);
  assert.match(html, /submitting this form sends my information to FormSubmit\.co/);
  assert.match(html, /may show a CAPTCHA or confirmation page/i);
  assert.match(html, /Please do not include passwords, API keys, customer records/i);
  assert.match(html, /href="mailto:jaime@bagdigital\.tech"/);
  assert.match(html, />jaime@bagdigital\.tech<\/a>/);
  assert.match(css, /\.contact-form-grid\{display:grid/);
  assert.match(css, /\.contact-consent input:focus-visible/);
  assert.match(css, /\.contact-honeypot\{position:absolute/);
  assert.doesNotMatch(html, /<script\b|<iframe\b|fetch\s*\(|_captcha=false|jaime@bagdigital\.com/i);
  assert.doesNotMatch(html, /signup|sign up|log in|password field|tracking pixel|analytics|live connected|customer metrics/i);
});

test("static page has self-hosted CSS and a restrictive source-level browser policy", () => {
  assert.match(html, /rel="stylesheet" href="\.\/styles\.css"/);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  for (const control of ["default-src 'none'", "script-src 'none'", "style-src 'self'", "connect-src 'none'", "form-action https://formspree.io"]) {
    assert.ok(html.includes(control), "Missing CSP directive " + control);
  }
  assert.doesNotMatch(html, /style="|<style\b|<script\b/i);
  assert.doesNotMatch(css, /@import\b|url\(\s*['"]?https?:/i);
});

test("selected Field Notes Metro tile layout retains accessibility and 320px mobile support", () => {
  assert.match(html, /class="skip" href="#main"/);
  assert.match(html, /<nav[^>]+aria-label="Main navigation"/);
  assert.match(html, /role="img" aria-label="Illustrative tiles: human-first technology/);
  assert.match(html, /href="#contact" aria-label="Discuss/g);
  assert.match(css, /\.tile-grid\{display:grid;grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(css, /\.service-main\{grid-column:span 7/);
  assert.match(css, /\.service-dark\{grid-column:span 5/);
  assert.match(css, /\.service-peach\{grid-column:span 5/);
  assert.match(css, /\.service-paper\{grid-column:span 7/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /scroll-behavior:auto/);
  for (const width of [1000, 760, 500, 360]) {
    assert.ok(css.includes("@media(max-width:" + width + "px)"), "Missing breakpoint " + width);
  }
});

test("public sitemap modification date and crawl destinations match the revised homepage", () => {
  const sitemap = readFileSync(new URL("../sitemap.xml", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../robots.txt", import.meta.url), "utf8");
  assert.match(sitemap, /<loc>https:\/\/bagdigital\.tech\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/bagdigital\.tech\/sitemap\.xml/);
  const match = sitemap.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
  assert.ok(match, "Publication sitemap must have an ISO modification date");
  assert.ok(match[1] >= "2026-10-15", "Modification date must include the latest substantive Oct 15 homepage revision");
  assert.match(html, /<meta name="description"/);
  assert.match(html, /property="og:description"/);
});


test("hero mosaic type preserves whole words at narrow and wide widths", () => {
  // Headless screenshot review found mid-word breaks in the decorative
  // illustration; preserve word wrapping and responsive font-size limits.
  assert.ok(css.includes(".hero-tile strong{display:block;overflow-wrap:normal;font-size:clamp(20px,2vw,28px)"));
  assert.ok(css.includes(".hero-tile:nth-child(1) strong{font-size:clamp(26px,2.4vw,35px)"));
  assert.ok(css.includes(".hero-tile .mark{display:none}"), "Decorative arrows should not overlap text in narrow hero tiles");
  assert.match(css, /@media\(max-width:1000px\)\{[\s\S]*?\.hero-tile strong\{font-size:20px\}/);
  assert.match(css, /@media\(max-width:500px\)\{[\s\S]*?\.hero-tile strong\{font-size:19px\}/);
  assert.match(css, /@media\(max-width:360px\)\{[\s\S]*?\.hero-tile strong\{font-size:17px\}/);
});

test("visitor sees concise Formspree processing note and required acknowledgment", () => {
  const notice = html.indexOf('id="contact-data-note"');
  const consent = html.indexOf('class="contact-consent"');
  assert.ok(notice > 0 && consent > notice, "Brief provider note must precede acknowledgment");
  assert.match(html, /Formspree receives your inquiry for BAGDigital/);
  assert.match(html, /href="\.\/privacy\.html" target="_blank" rel="noopener noreferrer">Privacy notice \(opens in a new tab\)<\/a>/);
  assert.equal((html.match(/href="\.\/privacy\.html"/g) || []).length, 2,
    "Privacy notice linked from the form and footer");
  assert.match(html, /submitting this form sends my information to Formspree for BAGDigital to review/);
  assert.match(html, /<input id="contact-consent" name="processing_ack" type="checkbox" value="yes" required>/);
  assert.match(css, /\.contact-form \.contact-data-note\{font-size:14px/);
  assert.doesNotMatch(html, /formsubmit\.co|_captcha=false|FormSubmit says/i);
  assert.match(privacy, /30 days of submission history on its Free plan/);
  assert.match(privacy, /Formspree's privacy policy \(opens in a new tab\)/);
});

test("first-party inquiry privacy notice is an actual scriptless same-origin page with truthful handling", () => {
  assert.match(privacy, /<html lang="en">/);
  assert.match(privacy, /<title>Inquiry Privacy Notice \| BAGDigital<\/title>/);
  assert.match(privacy, /href="https:\/\/bagdigital\.tech\/privacy\.html"/);
  assert.match(privacy, /href="\.\/styles\.css"/);
  assert.match(privacy, /script-src 'none'; style-src 'self'/);
  assert.match(privacy, /form-action 'none'/);
  assert.match(privacy, /id="main"/);
  for (const title of ["What information you provide", "How your inquiry is delivered", "How we use inquiries", "Retention and other providers", "Contact and requests"]) {
    assert.ok(privacy.includes(title), "Missing privacy section: " + title);
  }
  assert.match(privacy, /published account limits \(opens in a new tab\)/);
  assert.match(privacy, /30 days/);
  assert.match(privacy, /BAGDigital may separately retain email copies of inquiries as business correspondence/);
  assert.match(privacy, /does not subscribe you to a marketing mailing list/);
  assert.match(privacy, /request that we review, correct or delete information/);
  assert.match(privacy, /request is not a promise of immediate or complete deletion/);
  assert.match(privacy, /href="mailto:jaime@bagdigital\.tech"/);
  assert.match(privacy, /href="\.\/index\.html#contact"/);
  assert.doesNotMatch(privacy, /<form\b|<script\b|<iframe\b|<input\b|<button\b|_captcha=false|guaranteed deletion/i);
});

test("Formspree migration is scriptless and avoids unsupported server-side claims", () => {
  assert.ok(css.split("\n")[0].includes("inquiry form sends visitor-entered data to Formspree"));
  assert.ok(html.includes('method="post" action="https://formspree.io/f/xjygzpzk"'));
  assert.ok(html.includes('name="processing_ack" type="checkbox" value="yes" required'));
  assert.ok(html.includes('name="_gotcha"'));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes('type="file"'));
  assert.ok(!html.includes("formsubmit.co"));
  assert.match(readme, /Formspree xjygzpzk integration/);
  assert.match(readme, /dashboard security configuration is not verifiable from static source/);
  assert.match(readme, /server-side validation requires matching Workflow settings/);
});
