// Source-level checks for the unlinked customer-home DESIGN prototype.
// These cannot substitute for browser accessibility checks, production auth
// testing, or an independent security review before customer access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../.github/design-concepts/customer-home.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../.github/design-concepts/customer-home.css", import.meta.url), "utf8");
const publicHome = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("preview clearly identifies itself as nonfunctional and search-hidden", () => {
  assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html, /Design preview only/);
  assert.match(html, /Not a live account/);
  assert.match(html, /Synthetic data only/);
  assert.match(html, /Not an active entitlement/);
});

test("preview cannot capture credentials or perform provider requests", () => {
  assert.doesNotMatch(html, /<(?:form|input|textarea|script|iframe|button)\b/i);
  assert.doesNotMatch(html, /(?:<iframe|localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest)/i);
  assert.doesNotMatch(html, /(?:api[_-]?key|bearer\s+[a-z\d]+|sk-proj-)/i);
  assert.doesNotMatch(html, /Francisco['’]s Roofing LLC/i);
});

test("every illustrated provider and automation is explicitly unavailable", () => {
  assert.match(html, /0 CONNECTED/);
  assert.match(html, /0 ACTIVE/);
  assert.match(html, /Housecall Pro[\s\S]*?Integration unavailable in demo/);
  assert.match(html, /Google Workspace[\s\S]*?Planned integration/);
  assert.match(html, /ChatGPT[\s\S]*?Not available in demo/);
  assert.match(html, /Examples are product candidates, not enabled functionality/);
});

test("navigation is section-only and targets exist; marketing navigation stays untouched", () => {
  const anchorTags = [...html.matchAll(/<a\s+[^>]*href="([^"]+)"/g)];
  assert.ok(anchorTags.length >= 5);
  for (const [, destination] of anchorTags) {
    assert.ok(destination.startsWith("#"), `Expected in-page destination, got ${destination}`);
    const sectionId = destination.slice(1);
    assert.ok(html.includes(`id="${sectionId}"`), `Missing section ID: ${sectionId}`);
  }
  assert.doesNotMatch(publicHome, /prototypes\/customer-home\.html/);
});

test("prototype supports mobile screens, focus visibility, and reduced motion", () => {
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label="Page sections"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 435px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("concept lives outside the GitHub Pages Jekyll publication path", () => {
  // Current Pages source is branch Jekyll with no .nojekyll override.
  // A change to deployment mode must trigger separate hosting verification.
  assert.ok(new URL("../.github/design-concepts/customer-home.html", import.meta.url).pathname.includes("/.github/"));
  assert.doesNotMatch(publicHome, /design-concepts\/customer-home\.html/);
});
