// Temporary, source-only mitigation for Site #7 / RT-WEB-01.
// This test does not make provider requests, send email, or assess live hosting.
// Run: node --test tests/emergency-form-paused.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("the old public page has no active form, FormSubmit route or CAPTCHA bypass", () => {
  assert.doesNotMatch(html, /<form\b|<\/form>|https?:\/\/formsubmit\.co|_captcha|_honey|company_site/i);
  assert.doesNotMatch(html, /data-ajax-action|name="processing_ack"|id="quoteForm"/);
  assert.match(html, /form-action 'none';/);
  assert.doesNotMatch(html, /connect-src[^;]*formsubmit/i);
});

test("visitors get a truthful temporary notice and a direct contact path", () => {
  assert.match(html, /Our website inquiry form is temporarily unavailable/);
  assert.match(html, /href="mailto:jaime@bagdigital\.tech\?subject=BAGDigital%20consultation%20request"/);
  assert.match(html, /Please don't include passwords, API keys, customer records/);
  assert.match(html, /id="intake-paused-heading"/);
  assert.match(html, /id="emailLink"/);
});

test("legacy AJAX submission code is removed but navigation behavior remains", () => {
  assert.doesNotMatch(app, /\bfetch\s*\(|FormData|quoteForm|data-ajax-action|formStatus|setStatus|submitButton/);
  assert.match(app, /document\.addEventListener\("DOMContentLoaded"/);
  assert.match(app, /function setNavState/);
  assert.match(app, /function buildEmail/);
});
