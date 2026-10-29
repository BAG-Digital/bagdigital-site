import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const read = file => readFileSync(join(root, file), "utf8");
const examplePages = [
  "examples/index.html",
  "examples/one-page/index.html",
  "examples/business/index.html",
  "examples/business/services.html",
  "examples/business/projects.html",
  "examples/business/about.html",
  "examples/business/contact.html"
];

test("published package scope unchanged, with one clearly labeled preview per website tier", () => {
  const p = read("pricing.html");
  assert.equal((p.match(/class="price-card(?: price-feature)?"/g)||[]).length,6);
  assert.match(p, /One-Page Business Website[\s\S]*?\$1,295/);
  assert.match(p, /Business Website[\s\S]*?\$2,795/);
  assert.match(p, /href="\.\/examples\/one-page\/">See a realistic \$1,295 example/);
  assert.match(p, /href="\.\/examples\/business\/">See a realistic \$2,795 example/);
  assert.equal((p.match(/href="\.\/index\.html#contact">Discuss this service/g)||[]).length, 6);
  assert.match(p, /Hosting, domains, paid software, and third-party services are separate/);
});

test("all seven demonstration pages are static, crawl-blocked, and non-submitting", () => {
  for (const page of examplePages) {
    const html = read(page);
    assert.match(html, /<html lang="en">/, page);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,page + " H1");
    assert.match(html, /robots" content="noindex,nofollow"/,page);
    assert.match(html, /script-src 'none'/,page);
    assert.match(html, /connect-src 'none'/,page);
    assert.match(html, /form-action 'none'/,page);
    assert.match(html, /img-src https:\/\/images\.pexels\.com/,page);
    assert.match(html, /Fictional BAGDigital concept|Fictional Lowcountry businesses/i,page);
    assert.doesNotMatch(html, /<script\b|<iframe\b|<form\b|<style\b|style="/i,page);
    assert.doesNotMatch(html, /formspree\.io|formsubmit\.co|https?:\/\/api\./,page);
    assert.doesNotMatch(html, /customer testimonial|customer review score|we now offer live integrations|our real customer projects/i,page);
  }
});

test("every local example link and stylesheet resolves within repository", () => {
  const paths = new Set(examplePages.concat(["pricing.html","index.html","styles.css","examples/examples.css","examples/one-page/styles.css","examples/business/styles.css"]));
  for (const page of examplePages) {
    const html=read(page);
    for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href=match[1].split("#")[0].split("?")[0];
      if(!href || /^https?:\/\//.test(href) || href.startsWith("mailto:"))continue;
      const absolute=resolve(root, dirname(page), href);
      assert.ok(absolute.startsWith(root), "Path escapes site: "+page+" -> "+href);
      const target=href.endsWith("/")?join(absolute,"index.html"):absolute;
      assert.ok(existsSync(target),page+" missing "+href);
    }
  }
});

test("business tier demonstrates five actual pages and all demo contact controls are disabled", () => {
  const main=read("examples/business/index.html");
  for(const page of ["index.html","services.html","projects.html","about.html","contact.html"]){
    assert.match(main, new RegExp('href="\\./'+page.replace(".","\\.")+'"'));
  }
  const form=read("examples/business/contact.html");
  assert.match(form,/sending disabled/);
  assert.equal((form.match(/<input disabled|<textarea disabled|<select disabled|<button type="button" disabled/g)||[]).length,5);
});

test("no existing homepage form or restrictive source policy was altered to add previews", () => {
  const home=read("index.html");
  assert.match(home, /method="post" action="https:\/\/formspree\.io\/f\/xjygzpzk"/);
  assert.match(home, /name="processing_ack" type="checkbox" value="yes" required/);
  assert.match(home, /script-src 'none'/);
  assert.doesNotMatch(home, /href="\.\/examples\//);
});
