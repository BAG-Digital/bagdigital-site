import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const javaScript = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../privacy.html", import.meta.url), "utf8");

function sectionBetween(start, end) {
  const first = html.indexOf(start);
  const last = html.indexOf(end, first);

  assert.ok(first >= 0 && last > first, "Expected HTML section boundaries");
  return html.slice(first, last);
}

test("homepage prioritizes the customer's problem and a single primary contact action", () => {
  const hero = sectionBetween('<section class="hero" id="top">', '<section class="section" id="how">');

  assert.match(hero, /Keep your software\. Simplify the work\./);
  assert.match(hero, /Tell us what's slowing your team down/);
  assert.match(hero, /<a class="button button-primary" href="#contact">Tell us what's slowing you down<\/a>/);
  assert.match(hero, /<a class="button button-secondary" href="#examples">See examples<\/a>/);

  assert.doesNotMatch(hero, /\b(?:AWS|Vercel|GitHub|API|webhook|CI|tenant|credentials)\b/i);
  assert.doesNotMatch(hero, /(?:Connected now|Available today|Start free trial|Subscribe now)/i);
});

test("homepage describes example uses without misrepresenting integration availability", () => {
  const examples = sectionBetween('id="examples"', 'id="software"');
  const software = sectionBetween('id="software"', 'class="section safe-section"');

  assert.match(examples, /not features/);
  assert.match(software, /Not every system can be connected/);
  assert.doesNotMatch(software, /\b(?:QuickBooks|Xero|Stripe|ServiceTitan|HubSpot|Salesforce|Slack|Jobber)\b/);
  assert.match(software, /Customers & jobs/);
  assert.match(software, /Email & calendars/);
});

test("marketing content retains a meaningful customer permission explanation", () => {
  const permissionSection = sectionBetween('class="section safe-section"', 'id="questions"');

  assert.match(permissionSection, /You choose what to connect/);
  assert.match(permissionSection, /before you approve it/);
  assert.match(permissionSection, /Changing records or sending messages should require the right permission/);
  assert.doesNotMatch(permissionSection, /\b(?:AWS|IAM|RLS|OAuth|API key|GET \/company)\b/i);
});

test("stacked homepage change preserves the existing provider-side form safety contract", () => {
  const form = sectionBetween('<form', '</form>');

  assert.match(form, /action="https:\/\/formsubmit\.co\/(?!ajax\/)[^"]+"/);
  assert.match(form, /method="post"/);
  assert.match(form, /name="_honey"/);
  assert.doesNotMatch(form, /name="_captcha" value="false"/);
  assert.doesNotMatch(form, /novalidate/);
  assert.match(form, /href="\/privacy\.html"/);
  assert.match(form, /Do not submit credentials or sensitive customer\/business records/);
  assert.match(privacy, /FormSubmit/);
  assert.doesNotMatch(javaScript, /fetch\s*\(\s*ajaxAction/);
});

test("core navigation, page metadata, and contact anchors remain intact", () => {
  assert.match(html, /<main id="main">/);
  assert.match(html, /class="skip-link" href="#main"/);
  assert.match(html, /href="#contact"/);
  assert.match(html, /id="contact"/);
  assert.match(html, /id="quoteForm"/);
  assert.match(html, /rel="canonical" href="https:\/\/bagdigital\.tech\/"/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
});
