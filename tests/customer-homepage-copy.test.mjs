import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const javaScript = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../privacy.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

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
  assert.match(permissionSection, /We\'ll be clear about which actions require approval/);
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


test("visible navigation and illustrative workflow image have accessible targets", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate ID in public homepage");

  for (const [, href] of html.matchAll(/<a\b[^>]*href="(#[^"]+)"/g)) {
    assert.ok(ids.includes(href.slice(1)), "broken same-page navigation: " + href);
  }

  assert.match(html, /class="simple-diagram" role="img" aria-label="Illustrative workflow:/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-controls="primaryNav"/);
});


function luminance(hex) {
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("contact placeholders use a legible, reusable color with at least 4.5:1 text contrast", () => {
  const faint = css.match(/--faint:(#[0-9a-fA-F]{6})/);
  const inputSurface = css.match(/\.field input,.field select,.field textarea\s*\{[^}]*background:(#[0-9a-fA-F]{6})/);
  assert.ok(faint && inputSurface, "expected theme palette and form surface");
  assert.match(css, /\.field input::placeholder,.field textarea::placeholder\{color:var\(--faint\)\}/);
  assert.ok(contrastRatio(faint[1], inputSurface[1]) >= 4.5, "placeholder must meet WCAG AA normal-text contrast");
});


test("plain-English FAQ does not promise unsupported live product capabilities", () => {
  const questions = sectionBetween('id="questions"', 'id="contact"');

  assert.match(questions, /Will I need to replace the tools my team uses/);
  assert.match(questions, /Will this work with my software/);
  assert.match(questions, /We'll check what's possible before proposing a solution/);
  assert.match(questions, /We're introducing services gradually/);
  assert.doesNotMatch(questions, /(?:available on every plan|fully automated|works with any app)/i);
  assert.doesNotMatch(questions, /(?:AWS|GitHub|Vercel|GET \/company)/i);
});


test("direct email fallback is usable even when JavaScript is disabled", () => {
  assert.match(html, /id="emailLink" href="mailto:jaime@bagdigital\.tech"/);
  assert.match(html, /id="emailDirectBtn"[^>]+href="mailto:jaime@bagdigital\.tech"/);
  assert.match(javaScript, /EMAIL_USER: "jaime"/);
  assert.match(javaScript, /EMAIL_DOMAIN: "bagdigital\.tech"/);
});
