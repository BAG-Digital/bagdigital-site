import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../.github/design-concepts/', import.meta.url);
const pages = ['unified-homepage.html','unified-customer-home.html','unified-founder-console.html'];
for (const name of pages) {
 test(name + ' is synthetic and avoids external dependencies', () => {
  const html = readFileSync(new URL(name, root), 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /name="viewport"/);
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, /synthetic|design preview/i);
  assert.doesNotMatch(html, /<form\b|<iframe\b|<script[^>]+src=|<link[^>]+href="https?:|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/i);
  assert.doesNotMatch(html, /<input\b[^>]*type=["']password/i);
 });
}
test('homepage keeps illustrative claims and direct contact fallback', () => {
 const html=readFileSync(new URL('unified-homepage.html',root),'utf8');
 assert.match(html,/Illustrative example/);
 assert.match(html,/mailto:jaime@bagdigital\.com/);
 assert.match(html,/prefers-reduced-motion/);
 assert.match(html,/Skip to content/);
});
test('customer home uses honest disconnected and zero states',()=>{
 const html=readFileSync(new URL('unified-customer-home.html',root),'utf8');
 assert.match(html,/Not connected/);
 assert.match(html,/Pending approvals/);
 assert.match(html,/No pending approvals/);
 assert.match(html,/aria-current/);
 assert.match(html,/disabled>Connect tool/);
});
test('founder console has no real tenant or system claims',()=>{
 const html=readFileSync(new URL('unified-founder-console.html',root),'utf8');
 assert.match(html,/No real organizations/);
 assert.match(html,/No customer data/);
 assert.match(html,/Not connected/);
});

test('all three prototypes consume the shared design tokens',()=>{
 for(const name of pages){
  const html=readFileSync(new URL(name,root),'utf8');
  assert.match(html,/href="\.\/unified-tokens\.css"/);
 }
 const css=readFileSync(new URL('unified-tokens.css',root),'utf8');
 for(const token of ['--bag-ink','--bag-paper','--bag-ember','--bag-glass','--bag-focus'])assert.ok(css.includes(token));
 assert.match(css,/prefers-reduced-motion/);
});

test('customer preview uses explicit model binding without executable approvals',()=>{
 const html=readFileSync(new URL('unified-customer-home.html',root),'utf8');
 assert.match(html,/renderWorkspaceSummary\(document, syntheticWorkspace\(\)\)/);
 assert.match(html,/data-metric="connections"/);
 assert.match(html,/data-metric="approvals"/);
 assert.match(html,/data-metric="workflows"/);
 assert.doesNotMatch(html,/on(click|submit)=|<form\b/i);
});
