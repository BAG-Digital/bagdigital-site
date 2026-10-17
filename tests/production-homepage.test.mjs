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

test("protected inquiry source preview has no active or native submission path", () => {
  assert.doesNotMatch(html, /<form\b|<\/form>|formsubmit\.co|_captcha|_honey|\baction\s*=|\bmethod\s*=/i);
  assert.match(html, /class="contact-form"[^>]*role="group"/);
  assert.match(html, /Online submissions are unavailable in this preview/);
  assert.match(html, /id="protected-preview-notice" role="status" aria-live="polite"/);
  assert.match(html, /type="button" disabled/);
  for (const id of ["contact-name","contact-email","contact-business","contact-service","contact-details"])
    assert.match(html,new RegExp('id="'+id+'"[^>]*disabled'));
  assert.match(html, /href="mailto:jaime@bagdigital\.tech"/);
  assert.doesNotMatch(html, /<script\b|<iframe\b|fetch\s*\(/i);
  assert.match(css, /\.contact-form-grid\{display:grid/);
});

test("source-only disabled preview has restrictive no-post browser policy", () => {
  assert.match(html, /rel="stylesheet" href="\.\/styles\.css"/);
  for (const csp of ["default-src 'none'","script-src 'none'","style-src 'self'","connect-src 'none'","form-action 'none'"])
    assert.ok(html.includes(csp),"Missing browser CSP: "+csp);
  assert.doesNotMatch(html, /<script\b|<style\b|style="/i);
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

test("disabled preview provides honest processor notice before any consent or send controls", () => {
  const notice=html.indexOf('id="contact-data-note"');
  assert.ok(notice>=0);
  assert.doesNotMatch(html,/FormSubmit|name="processing_ack"|type="submit"/i);
  assert.match(html,/role="status" aria-live="polite"/);
  assert.match(html,/href="\.\/privacy\.html" target="_blank" rel="noopener noreferrer"/);
  assert.match(html,/No information entered here is submitted or stored by this webpage/);
  assert.match(html,/email provider's and BAGDigital's normal handling practices/);
  assert.match(html,/href="mailto:jaime@bagdigital\.tech"/);
});

test("inactive preview privacy notice truthfully describes direct email, not unselected providers", () => {
  assert.match(privacy, /<title>Inquiry Privacy Notice \| BAGDigital<\/title>/);
  assert.match(privacy,/href="\.\/styles\.css"/);
  assert.match(privacy,/script-src 'none'; style-src 'self'/);
  assert.match(privacy,/form-action 'none'/);
  assert.match(privacy,/id="main"/);
  assert.match(privacy,/online inquiry form disabled/i);
  assert.match(privacy,/your own email application/);
  assert.match(privacy,/future working online form will receive updated provider/i);
  assert.doesNotMatch(privacy, /FormSubmit|<form\b|<script\b|<iframe\b|<input\b|<button\b/i);
  assert.match(privacy,/mailto:jaime@bagdigital\.tech/);
  assert.match(privacy,/href="\.\/index\.html#contact"/);
});

test("preview documentation and CSS do not claim a working protected endpoint", () => {
  assert.match(css.split("\\n")[0], /online intake is disabled/);
  assert.match(readme,/Site #26 source-only safety integration, NOT PUBLISHED/);
  assert.match(readme,/not a functioning protected contact form/i);
  assert.match(readme,/Site #7 remains OPEN/);
  assert.match(html,/Online submissions are unavailable in this preview/);
  assert.doesNotMatch(html, /FormSubmit|<form\\b|<script\\b/);
});
