/**
 * Static safety checks for the temporary public inquiry form.
 *
 * These tests verify local source contracts only. They cannot prove FormSubmit's
 * live CAPTCHA challenge, inbox delivery, or provider-side spam filtering.
 * Those require separately approved non-sensitive browser/provider smoke tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(siteRoot, "index.html"), "utf8");
const script = readFileSync(join(siteRoot, "app.js"), "utf8");
const privacy = readFileSync(join(siteRoot, "privacy.html"), "utf8");

test("inquiry posts to the provider's normal HTML endpoint, not AJAX", () => {
  assert.match(html, /<form\s[\s\S]*?id="quoteForm"[\s\S]*?action="https:\/\/formsubmit\.co\/(?!ajax\/)[^"]+"/);
  assert.match(html, /method="post"/);
  assert.doesNotMatch(html, /data-ajax-action=/);
  assert.doesNotMatch(script, /fetch\s*\(\s*ajaxAction/);
});

test("provider-side anti-spam controls are not disabled or renamed", () => {
  assert.match(html, /<input[^>]+name="_honey"[^>]*>/);
  assert.doesNotMatch(html, /name="company_site"/);
  assert.doesNotMatch(html, /name="_captcha"\s+value="false"/);
  assert.doesNotMatch(html, /\bnovalidate\b/);
});

test("inquiry preserves accessible required fields and a direct email alternative", () => {
  assert.match(html, /name="name"[^>]*required/);
  assert.match(html, /name="email"[^>]*required/);
  assert.match(html, /name="details"[\s\S]*?required/);
  assert.match(html, /id="emailDirectBtn"/);
  assert.match(html, /href="\/privacy\.html"/);
});

test("privacy notice describes the relay and potential CAPTCHA redirect", () => {
  assert.match(privacy, /FormSubmit/);
  assert.match(privacy, /CAPTCHA/);
  assert.match(html, /anti-spam verification/);
});
