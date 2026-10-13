import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const markup=readFileSync(
  new URL('../.github/design-concepts/material-organic-homepage.html',import.meta.url),
  'utf8'
);

test('organic homepage is explicitly a noindex design concept',()=>{
  assert.match(markup,/<!doctype html>/i);
  assert.match(markup,/name="viewport"/);
  assert.match(markup,/name="robots" content="noindex"/);
  assert.match(markup,/Independent concept preview/);
  assert.match(markup,/Illustrative example/);
  assert.match(markup,/No live customer integration/);
});

test('the preview does not load external content or submit data silently',()=>{
  assert.doesNotMatch(markup,/<script\b[^>]+src=|<img\b|<iframe\b|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document\.cookie/i);
  assert.doesNotMatch(markup,/<form\b[^>]*action=|<input\b[^>]*type=["']password/i);
  assert.match(markup,/event\.preventDefault\(\)/);
  assert.match(markup,/mailto:jaime@bagdigital\.com/);
  assert.match(markup,/has not sent or stored your inquiry/);
});

test('navigation and sections are real destinations',()=>{
  for(const id of ['main','top','services','how','about','contact']){
    assert.match(markup,new RegExp('id="'+id+'"'));
  }
  assert.match(markup,/class="skip" href="#main"/);
  assert.match(markup,/aria-label="Main navigation"/);
});

test('the consultation fields have explicit labels and reasonable bounds',()=>{
  for(const id of ['visitor-name','business-name','visitor-email','interest','project-details']){
    assert.match(markup,new RegExp('<label for="'+id+'">'));
    assert.match(markup,new RegExp('id="'+id+'"'));
  }
  assert.match(markup,/type="email"[^>]*required/);
  assert.match(markup,/name="details" maxlength="800" required/);
  assert.match(markup,/role="status" aria-live="polite"/);
});

test('responsive and reduced-motion behavior are specified',()=>{
  for(const breakpoint of ['980px','760px','480px']){
    assert.ok(markup.includes('max-width:'+breakpoint));
  }
  assert.match(markup,/prefers-reduced-motion:reduce/);
  assert.match(markup,/:focus-visible/);
  assert.doesNotMatch(markup,/font-family:\s*["']?Google/i);
});
