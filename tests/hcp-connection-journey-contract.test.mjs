import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const htmlLocation = new URL("../.github/design-concepts/hcp-connection-journey.html", import.meta.url);
const cssLocation = new URL("../.github/design-concepts/hcp-connection-journey.css", import.meta.url);
const html = readFileSync(htmlLocation, "utf8");
const css = readFileSync(cssLocation, "utf8");
const publicHome = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("design preview is explicitly not a live portal or customer connection", () => {
  assert.match(html, /DESIGN STUDY \/ NOT A LIVE PORTAL/);
  assert.match(html, /Illustrative screens only/);
  assert.match(html, /SYNTHETIC \/ NO CUSTOMER DATA/);
  assert.match(html, /NOT CONNECTED/);
  assert.match(html, /READ VERIFIED \/ EXAMPLE/);
  assert.match(html, /ALL THREE ARE ILLUSTRATIONS/);
  assert.match(html, /hypothetical/i);
  assert.match(html, /This card is not evidence that such a call occurred/);
});

test("there are no executable actions, credential inputs, scripts or provider calls", () => {
  assert.doesNotMatch(html, /<(?:script|form|input|textarea|iframe|button|select)\b/i);
  assert.doesNotMatch(html, /(?:localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|navigator\.|onerror=|onclick=)/i);
  assert.doesNotMatch(html, /(?:HCP_API_KEY|sk-proj-|Bearer\s+[a-z0-9]+|https?:\/\/api\.housecallpro)/i);
  assert.doesNotMatch(css, /(?:@import|url\s*\()/i);
  assert.match(html, /Connect account \/ unavailable/);
  assert.doesNotMatch(html, /Francisco(?:'|’|&apos;)s Roofing/i);
});

test("preview is search-hidden, external-resource-blocked and locally styled", () => {
  assert.match(html, /content="noindex,nofollow,noarchive"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /style-src 'self'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /href="\.\/hcp-connection-journey\.css"/);
  assert.doesNotMatch(html, /href="https?:\/\//);
  assert.doesNotMatch(html, /src="https?:\/\//);
});

test("all links stay on the page and have real destinations", () => {
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)];
  assert.ok(anchors.length >= 5, "expected visible internal navigation");
  for (const [, destination] of anchors) {
    assert.ok(destination.startsWith("#"), "outbound or live-looking link found");
    assert.ok(html.includes('id="' + destination.slice(1) + '"'), "missing target " + destination);
  }
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /<main id="main">/);
});

test("status cards distinguish readiness from provider and credential authorization", () => {
  assert.match(html, /Approve|approval|approved/i);
  assert.match(html, /GET \/company/);
  assert.match(html, /Never paste API keys into this page/);
  assert.match(html, /No access assumed/);
  assert.match(html, /Writes still disabled/);
  assert.match(html, /server check your permissions/);
  assert.match(html, /No Housecall Pro account is connected in this design/);
});

test("layout includes keyboard, narrow-screen and reduced-motion affordances", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /<ol class="journey">/);
});

test("public BAGDigital homepage does not expose the unpublished concept", () => {
  assert.ok(htmlLocation.pathname.includes("/.github/design-concepts/"));
  assert.doesNotMatch(publicHome, /hcp-connection-journey\.html/);
  assert.doesNotMatch(publicHome, /design-concepts\//);
});
