import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../.github/design-concepts/unified-customer.js',import.meta.url),'utf8');
const moduleUrl='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {normalizeConnection,syntheticWorkspace,VIEW_IDS}=await import(moduleUrl);
test('preview workspace is disconnected and has no invented operational activity',()=>{
 const model=syntheticWorkspace();
 assert.equal(model.pendingApprovalsCount,0);
 assert.equal(model.activeWorkflowsCount,0);
 assert.deepEqual(model.recentActivity,[]);
 assert.ok(model.connections.every(c=>c.status==='not_connected'));
 assert.ok(Object.isFrozen(model));
});
test('connected requires verification and explicit capabilities',()=>{
 assert.throws(()=>normalizeConnection({status:'connected'}),/requires verifiedAt/);
 assert.throws(()=>normalizeConnection({status:'connected',verifiedAt:'2026-10-13'}),/allowedCapabilities/);
 const connected=normalizeConnection({status:'connected',verifiedAt:'2026-10-13',allowedCapabilities:['jobs.read']});
 assert.deepEqual(connected.allowedCapabilities,['jobs.read']);
 assert.ok(Object.isFrozen(connected.allowedCapabilities));
});
test('unknown connection statuses rejected',()=>assert.throws(()=>normalizeConnection({status:'healthy'}),/Unknown connection status/));
test('navigation has four known sections and no network/storage operations',()=>{
 assert.deepEqual(VIEW_IDS,['home','connections','approvals','activity']);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|WebSocket/);
 const html=readFileSync(new URL('../.github/design-concepts/unified-customer-home.html',import.meta.url),'utf8');
 assert.match(html,/type="module"/);
 assert.match(html,/unified-customer\.js/);
 assert.match(html,/class="view hidden" hidden/);
});
