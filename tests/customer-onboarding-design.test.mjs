import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../.github/design-concepts/", import.meta.url);
const html = readFileSync(new URL("customer-onboarding.html", root), "utf8");
const css = readFileSync(new URL("customer-onboarding.css", root), "utf8");
const js = readFileSync(new URL("customer-onboarding.js", root), "utf8");
const publicHome = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("preview does not advertise functional registration", () => {
  assert.match(html, /INTERACTIVE DESIGN PREVIEW — NOT LIVE SIGNUP/);
  assert.match(html, /No account is created/);
  assert.match(html, /This is a preview/);
  assert.match(html, /A future workspace/);
  assert.match(html, /Coming soon|NOT AVAILABLE YET/);
  assert.match(html, /EXAMPLE \/ NOT LIVE/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /Customer onboarding experience preview/);
});

test("preview cannot collect credentials or post to business APIs", () => {
  for (const text of [html, css, js]) {
    assert.doesNotMatch(text, /<(?:form|input|textarea|iframe|select)\b/i);
    assert.doesNotMatch(text, /(?:fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|localStorage|sessionStorage|indexedDB|navigator\.sendBeacon|document\.cookie)/i);
    assert.doesNotMatch(text, /(?:sk-proj-|Bearer [a-z0-9]{8,}|HCP_API_KEY|OPENAI_API_KEY)/i);
  }
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(js, /(?:innerHTML|outerHTML|insertAdjacentHTML)/);
  assert.doesNotMatch(css, /(?:@import|url\s*\()/i);
});

test("four-stage journey is explicit and accessible", () => {
  for (const id of ["screenAccount", "screenBusiness", "screenPriorities", "screenWorkspace", "continueBtn", "previousBtn", "progressFill", "stepCount"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /disabled>← Back/);
  assert.match(js, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(js, /step === 3 \? "Restart preview/);
  assert.match(js, /businessMode = "create"/);
  assert.match(js, /priority = "followup"/);
});

test("shows truthful zero-connection state with no public free-plan offer", () => {
  assert.match(html, /Connected tools/);
  assert.match(html, /Active automations/);
  assert.match(html, /Actions sent/);
  assert.match(html, /NOT AVAILABLE YET/);
  assert.match(html, /Your real account, plan and setup status must come from a verified sign-in/);
  assert.doesNotMatch(html, /(?:Francisco's Roofing|Free plan|Design Partner subscription|Housecall Pro is connected)/);
});

test("no broken in-page links or heading references", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.equal(ids.length, new Set(ids).size, "duplicate IDs");
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  for(const [, target] of html.matchAll(/href="(#[^"]+)"/g)) assert.ok(ids.includes(target.slice(1)), "missing anchor " + target);
  for(const [, refs] of html.matchAll(/aria-labelledby="([^"]+)"/g)) for(const id of refs.split(" ")) assert.ok(ids.includes(id), "missing aria label " + id);
});

test("mobile and reduced-motion styling present and unpublished", () => {
  assert.match(css, /@media\(max-width:960px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(publicHome, /customer-onboarding\.html/);
});
