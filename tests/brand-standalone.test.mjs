import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const folder=new URL("../.github/design-concepts/",import.meta.url);
const variants=[
  {id:"relay",title:"Work,",cta:"Let's talk about your business"},
  {id:"tide",title:"room to flow",cta:"Start a conversation"},
  {id:"notes",title:"Good business",cta:"Request a free consultation"}
];

for(const variant of variants){
 test(variant.id+" opens as a standalone responsive theme without JavaScript",()=>{
   const page=readFileSync(new URL(variant.id+".html",folder),"utf8");
   assert.match(page,/<!doctype html>/i);
   assert.match(page,/name="robots" content="noindex"/);
   assert.match(page,new RegExp('class="view '+variant.id+'"'));
   assert.match(page,new RegExp('id="'+variant.id+'"'));
   if (variant.id!=="notes") assert.match(page,/aria-current="page"/);
   assert.ok(page.includes(variant.title));
   assert.ok(page.includes(variant.cta));
   assert.match(page,/mailto:jaime@bagdigital\.com/);
   assert.match(page,/@media\(max-width:620px\)/);
   assert.match(page,/@media\(prefers-reduced-motion:reduce\)/);
   assert.match(page,/:focus-visible/);
   assert.doesNotMatch(page,/<script\b|<form\b|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|WebSocket|<iframe\b|<img\b/);
   assert.doesNotMatch(page,/<section\b[^>]*\shidden(?:\b|=)/);
   if (variant.id!=="notes") for (const other of variants) assert.match(page,new RegExp('href="\\./'+other.id+'\\.html"'));
 });
}

test("standalone themes do not rely on unverified proof or real integrations",()=>{
 const pages=variants.map(v=>readFileSync(new URL(v.id+".html",folder),"utf8")).join("\n");
 assert.doesNotMatch(pages,/five.star.review|verified.customer.results|live.connected.Housecall.Pro|revenue.saved/i);
 assert.match(pages,/No live customer data|No live integrations|no live product claims/i);
});

test("selected Field Notes uses a text-only BAGDigital wordmark and buyer-friendly menu",()=>{
  const html=readFileSync(new URL("notes.html",folder),"utf8");
  assert.match(html,/<a class="wordmark" href="#notes" aria-label="BAGDigital home">BAGDigital<\/a>/);
  assert.doesNotMatch(html,/<a class="wordmark"[^>]*><svg/);
  assert.doesNotMatch(html,/class="deck-head"/);
  assert.match(html,/class="skip" href="#main"/);
  for(const [label,id] of [["Services","n-services"],["How it works","n-process"],["About","n-about"],["Free consultation","n-contact"]]){
    assert.ok(html.includes('href="#'+id+'"'),label+' link');
    assert.ok(html.includes('id="'+id+'"'),label+' anchor');
  }
  assert.match(html,/Email us about your project/);
  assert.match(html,/Design preview, not the published website/);
  assert.doesNotMatch(html,/fake testimonials|No invented success stories|Field Notes logo concept/i);
});
