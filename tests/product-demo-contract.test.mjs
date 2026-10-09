import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../prototypes/product-demo/", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const js = readFileSync(new URL("demo.js", root), "utf8");
const css = readFileSync(new URL("demo.css", root), "utf8");
const publicHomepage = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("demonstration does not pretend to be a live integration", () => {
  assert.match(html, /DEMONSTRATION ONLY/);
  assert.match(html, /All names, requests, and results are fictional/);
  assert.match(html, /Nothing is connected or sent/);
  assert.match(html, /SIMULATED WALKTHROUGH/);
  assert.match(html, /This demonstration does not connect to software/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.doesNotMatch(html, /(?:Francisco(?:'|’|&apos;)s Roofing|Visually Chopped|Housecall Pro|Facebook|Instagram)/i);
});

test("simulation has no network, provider, storage, analytics or credential machinery", () => {
  for (const source of [html, js, css]) {
    assert.doesNotMatch(source, /(?:fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|navigator\.sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|https?:\/\/api\.)/i);
    assert.doesNotMatch(source, /(?:HCP_API_KEY|OPENAI_API_KEY|sk-proj-|Bearer\s+[a-z0-9]{6,}|api[_-]?key\s*[:=])/i);
    assert.doesNotMatch(source, /(?:<iframe|<form|<input|<textarea|<img\b|<video|<audio)/i);
  }
  assert.doesNotMatch(js, /(?:innerHTML|outerHTML|insertAdjacentHTML|eval\s*\(|new\s+Function)/);
  assert.doesNotMatch(css, /(?:@import|url\s*\()/i);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self'/);
});

test("all user choices and approval outcomes are simulated locally", () => {
  assert.match(js, /const EXAMPLES = Object\.freeze/);
  assert.match(js, /service: Object\.freeze/);
  assert.match(js, /marketing: Object\.freeze/);
  assert.match(js, /DRAFT ONLY/);
  assert.match(js, /APPROVED IN DEMO/);
  assert.match(js, /No message was sent and no external account was changed/);
  assert.match(js, /advance\.disabled = phase === 3/);
  assert.match(js, /phase = 0/);
  assert.match(js, /\.textContent = example\.reply/);
  assert.doesNotMatch(js, /new Date\(/); // never claim real-time activity
});

test("scenario buttons are real accessible controls with clear status and human review", () => {
  assert.match(html, /id="serviceBtn"[^>]+aria-pressed="true"/);
  assert.match(html, /id="marketingBtn"[^>]+aria-pressed="false"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /id="advanceBtn"/);
  assert.match(html, /id="resetBtn"/);
  assert.match(html, /aria-label="Example workflow progress"/);
  assert.match(html, /Nothing is sent automatically/);
});

test("public site does not link to the unpublished demonstration", () => {
  assert.doesNotMatch(publicHomepage, /product-demo\/index\.html/);
  assert.doesNotMatch(publicHomepage, /prototypes\/product-demo/);
});

test("internal links and accessibility IDs are consistent", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  for (const [, href] of html.matchAll(/<a\b[^>]*href="(#[^"]+)"/g)) {
    assert.ok(ids.includes(href.slice(1)), "missing internal destination " + href);
  }
  for (const [, ref] of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
    for (const id of ref.split(" ")) assert.ok(ids.includes(id), "missing label " + id);
  }
});

test("responsive, keyboard and reduced-motion styles are present", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:790px\)/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
