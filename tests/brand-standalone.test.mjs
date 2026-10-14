import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const folder = new URL("../.github/design-concepts/", import.meta.url);
const variants = [
  { id:"relay", title:"Work,", cta:"Let's talk about your business" },
  { id:"tide", title:"room to flow", cta:"Start a conversation" },
  { id:"notes", title:"Good business", cta:"Request a free consultation" },
];

for (const variant of variants) {
  test(variant.id + " opens standalone without JavaScript or external resources", () => {
    const page = readFileSync(new URL(variant.id + ".html", folder), "utf8");
    assert.match(page, /<!doctype html>/i);
    assert.match(page, /name="robots" content="noindex"/);
    assert.ok(page.includes(variant.title));
    assert.ok(page.includes(variant.cta));
    assert.match(page, /mailto:jaime@bagdigital\.com/);
    assert.match(page, /@media\(max-width:620px\)|@media\(max-width:500px\)/);
    assert.match(page, /@media\(prefers-reduced-motion:reduce\)/);
    assert.match(page, /:focus-visible/);
    assert.doesNotMatch(page, /<script\b|<form\b|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|WebSocket|<iframe\b|<img\b/i);
    assert.doesNotMatch(page, /<section\b[^>]*\shidden(?:\b|=)/);
    if(variant.id !== "notes") {
      assert.match(page, /aria-current="page"/);
      assert.match(page, new RegExp('class="view ' + variant.id + '"'));
      for(const other of variants) assert.match(page, new RegExp('href="\\./' + other.id + '\\.html"'));
    }
  });
}

test("all design studies avoid fake live integrations and invented evidence", () => {
  const pages=variants.map(v => readFileSync(new URL(v.id + ".html",folder),"utf8")).join("\n");
  assert.doesNotMatch(pages,/five.star.review|verified.customer.results|live.connected.Housecall.Pro|revenue.saved/i);
  assert.match(pages,/No live customer data|No live integrations|no live product claims/i);
});

test("selected Field Notes is plain BAGDigital with buyer-friendly menu",()=>{
  const html=readFileSync(new URL("notes.html",folder),"utf8");
  assert.match(html,/<a class="wordmark" href="#top" aria-label="BAGDigital home">BAGDigital<\/a>/);
  assert.doesNotMatch(html,/<a class="wordmark"[^>]*><svg|logo concept|class="deck-head"/i);
  assert.match(html,/class="skip" href="#main"/);
  for(const id of ["services","how","about","contact"]) {
    assert.match(html,new RegExp('href="#'+id+'"'));
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/How it works/);
  assert.match(html,/Let's talk/);
  assert.match(html,/Email us about your project/);
  assert.match(html,/Field Notes tile design concept/);
  assert.match(html,/Preview only: the link opens your email app/);
});

test("Field Notes uses a varied-size CSS tile mosaic with accessible descriptions",()=>{
  const html=readFileSync(new URL("notes.html",folder),"utf8");
  assert.match(html,/class="tile-grid"/);
  assert.match(html,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(html,/class="service service-main"/);
  assert.match(html,/class="service service-dark"/);
  assert.match(html,/class="service service-peach"/);
  assert.match(html,/class="service service-paper"/);
  assert.match(html,/\.service-main\{grid-column:span 7/);
  assert.match(html,/\.service-dark\{grid-column:span 5/);
  assert.match(html,/\.service-peach\{grid-column:span 5/);
  assert.match(html,/\.service-paper\{grid-column:span 7/);
  assert.equal((html.match(/class="service service-/g) || []).length,4);
  assert.equal((html.match(/href="#contact" aria-label="Discuss/g) || []).length,4);
  assert.match(html,/role="img" aria-label="Abstract tile illustration/);
});

test("responsive tile grid collapses without horizontal scrolling or animations for reduced motion",()=>{
  const html=readFileSync(new URL("notes.html",folder),"utf8");
  for(const bp of [1000,760,500,360]) {
    assert.ok(html.includes("@media(max-width:" + bp + "px)"),"Missing breakpoint "+bp);
  }
  assert.match(html,/\.tile-grid\{grid-template-columns:1fr\}/);
  assert.match(html,/prefers-reduced-motion:reduce/);
  assert.match(html,/transition-duration:0\.01ms!important/);
  assert.match(html,/\.button:hover,\.service:hover,\.service:hover \.arrow\{transform:none\}/);
});
