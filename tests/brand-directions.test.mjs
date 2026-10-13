import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../.github/design-concepts/three-brand-directions.html',import.meta.url),'utf8');
const design=readFileSync(new URL('../docs/design/brand-directions-review.md',import.meta.url),'utf8');

test('only three clearly identified non-public concept views exist',()=>{
  assert.match(html,/name="robots" content="noindex"/);
  assert.match(html,/Exploration only/);
  for(const [id,name] of [['relay','Relay'],['tide','Tide'],['notes','Field Notes']]){
    assert.match(html,new RegExp('class="view '+id+'"'));
    assert.match(html,new RegExp('data-choice="'+id+'"'));
    assert.match(html,new RegExp('Direction \\d\\d — '+name));
  }
  assert.equal((html.match(/class="view (relay|tide|notes)"/g)||[]).length,3);
});

test('controls toggle pressed status, hide other views, and preserve keyboard focus',()=>{
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/aria-pressed="false"/);
  assert.match(html,/button\.dataset\.choice===id/);
  assert.match(html,/view\.hidden=view\.id!==id/);
  assert.match(html,/main\?\.focus\(\{preventScroll:true\}\)/);
  assert.match(html,/class="skip" href="#selection"/);
});

test('concepts share real, honest call-to-actions without a fake submit workflow',()=>{
  assert.equal((html.match(/mailto:jaime@bagdigital\.com\?subject=/g)||[]).length,3);
  assert.doesNotMatch(html,/<form\b|<input\b|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|WebSocket|<iframe\b|<img\b/i);
  assert.doesNotMatch(html,/<script\s+src=|<link\s+rel="stylesheet"/i);
  assert.match(html,/not collect or store inquiries|does not collect or store inquiries/i);
});

test('three design languages are materially different and do not feature forbidden tropes',()=>{
  for(const color of ['#f5f4ed','#eff5f0','#fbf8ef']) assert.ok(html.toLowerCase().includes(color));
  for(const name of ['Work,','room to flow','Good business']) assert.ok(html.includes(name));
  assert.match(design,/competitor websites/i);
  assert.match(design,/independent Prism review/i);
  assert.match(design,/Material-inspired usability/);
  assert.doesNotMatch(html,/testimonials|star rating|hours saved|real-time dashboard|customer revenue|housecall pro is connected/i);
});

test('mobile layouts, focus visibility, and reduced motion are present',()=>{
  assert.match(html,/@media\(max-width:900px\)/);
  assert.match(html,/@media\(max-width:620px\)/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html,/:focus-visible/);
  assert.match(html,/@media\(max-width:620px\)/);
});

test('design review defines release and product-security boundaries',()=>{
  for(const term of ['Site #7 / PR #5','Core','Vesper','Mara','Prism','Founder selection']) assert.ok(design.includes(term),term);
  assert.match(design,/public GitHub Pages separate/);
  assert.match(design,/do not collect or submit a real lead/i);
});
