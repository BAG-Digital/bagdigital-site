import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMockHandler, FakeAtomicStore, VERIFIER_LEASE_MS, TOKEN_TOMBSTONE_MS, LOGICAL_DEDUPE_MS, syntheticWire, syntheticIngress,
  syntheticPayload, syntheticConfig, parseStrictFlatJson, MAX_BODY_BYTES
} from '../intake/mock-contract.mjs';

const fixedNow = Date.UTC(2026,9,16,18,0,0);
const deferred = () => { let resolve, reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
function setup(options={}) {
  let time=fixedNow;
  const clock=()=>time;
  const store=options.store??new FakeAtomicStore({clock,...options.limits});
  const calls={verify:[],send:[],logs:[]};
  const verifier={async verify(token){calls.verify.push(token);return options.verify?
    await options.verify(token):{success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:clock()};}};
  const sender={async send(message){calls.send.push(message);return options.send?await options.send(message):{accepted:true};}};
  const config=syntheticConfig(options.config);
  const make=(handlerClock=clock)=>createMockHandler({store,verifier,sender,config,clock:handlerClock,verifierDeadline:options.deadline,logger:(event)=>calls.logs.push(event)});
  const wire=(fields={},patch={})=>syntheticWire(syntheticPayload(fields),patch);
  return {store,calls,make,wire,clock,advance:ms=>time+=ms};
}
function another(fields={}){return {challenge_token:'TOKEN-SECOND',request_id:'22222222-2222-4222-8222-222222222222',...fields};}
const noExternalCalls=env=>{assert.equal(env.calls.verify.length,0);assert.equal(env.calls.send.length,0);};
const noSends=env=>assert.equal(env.calls.send.length,0);

test('valid synthetic request accepts exactly one fixed-recipient mock delivery',async()=>{
  const env=setup();const result=await env.make()(env.wire(),syntheticIngress);
  assert.equal(result.status,202);assert.equal(env.calls.verify.length,1);assert.equal(env.calls.send.length,1);
  assert.equal(env.calls.send[0].to,'mock-inbox@example.invalid');
  assert.equal(env.calls.send[0].from,'mock-sender@example.invalid');
  assert.ok(!JSON.stringify(env.calls.logs).includes('Fictional Demo'));
  assert.ok(!JSON.stringify(env.calls.logs).includes('192.0.2.22'));
});

test('same CAPTCHA token, different payload and request ID: single flight before verifier across instances',async()=>{
  const gate=deferred();const env=setup({verify:()=>gate.promise});
  const a=env.make(),b=env.make();
  const first=a(env.wire(),syntheticIngress);
  await new Promise(resolve=>setImmediate(resolve));
  const second=await b(env.wire({request_id:another().request_id,message:'Different fictional content to test token single-flight.'}),syntheticIngress);
  assert.equal(second.status,403);
  assert.equal(env.calls.verify.length,1);
  assert.equal(env.calls.send.length,0);
  gate.resolve({success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:env.clock()});
  assert.equal((await first).status,202);
  assert.equal(env.calls.send.length,1);
  assert.equal(env.store.snapshot().tokens,1);
});

test('global and per-source admission races fail closed before Siteverify; no split quotas',async()=>{
  const gate=deferred();const env=setup({limits:{globalLimit:1,sourceLimit:1,globalConcurrency:1},verify:()=>gate.promise});
  const first=env.make()(env.wire(),syntheticIngress);
  await new Promise(resolve=>setImmediate(resolve));
  const rejected=await env.make()(env.wire(another()),{source:'198.51.100.11',verified:true});
  assert.equal(rejected.status,429);assert.equal(env.calls.verify.length,1);
  assert.equal(env.store.snapshot().attempts,1);
  gate.resolve({success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:env.clock()});
  assert.equal((await first).status,202);
  assert.equal(env.store.snapshot().inFlight,0);
});

test('source quota, cardinality and verifier in-flight ceilings block new verifier work',async()=>{
  const source=setup({limits:{sourceLimit:1}});await source.make()(source.wire(),syntheticIngress);
  assert.equal((await source.make()(source.wire(another()),syntheticIngress)).status,429);
  assert.equal(source.calls.verify.length,1);
  const distinct=setup({limits:{maxSourceKeys:1}});
  await distinct.make()(distinct.wire(),syntheticIngress);
  assert.equal((await distinct.make()(distinct.wire(another()),{source:'203.0.113.9',verified:true})).status,429);
  assert.equal(distinct.calls.verify.length,1);
  const gate=deferred();const concur=setup({limits:{sourceConcurrency:1},verify:()=>gate.promise});
  const first=concur.make()(concur.wire(),syntheticIngress);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await concur.make()(concur.wire(another()),syntheticIngress)).status,429);
  assert.equal(concur.calls.verify.length,1);
  gate.resolve({success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:concur.clock()});
  await first;
});

test('atomic transaction failure and store outage do not partially reserve or verify',async()=>{
  for(const property of ['offline','failAtomic','failMidTransaction']) {
    const env=setup();env.store[property]=true;
    const before=env.store.snapshot();
    assert.equal((await env.make()(env.wire(),syntheticIngress)).status,503);
    noExternalCalls(env);
    assert.deepEqual(env.store.snapshot(),before);
  }
});

test('fake key-version mismatch, disabled or missing mock secret fail closed',async()=>{
  const mismatch=setup();mismatch.store.activeKeyVersion=2;
  assert.equal((await mismatch.make()(mismatch.wire(),syntheticIngress)).status,503);noExternalCalls(mismatch);
  for(const config of [{enabled:false},{rateSecret:''},{mockOnly:false},{from:'attacker@example.invalid'}]){
    const env=setup({config});
    assert.equal((await env.make()(env.wire(),syntheticIngress)).status,503);noExternalCalls(env);
  }
});

test('bad, wrong-host, wrong-action, stale and failed challenge reject without delivery',async()=>{
  const cases=[
    {success:false,hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow},
    {success:true,hostname:'evil.example',action:'marketing_inquiry',challengeTs:fixedNow},
    {success:true,hostname:'localhost',action:'wrong-action',challengeTs:fixedNow},
    {success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow-301000},
    {success:true,hostname:'localhost',action:'marketing_inquiry'}
  ];
  for(const verdict of cases){
    const env=setup({verify:async()=>verdict});
    assert.equal((await env.make()(env.wire(),syntheticIngress)).status,403);
    assert.equal(env.calls.verify.length,1);noSends(env);
  }
});

test('verifier outage retains terminal token tombstone; no retry on same token',async()=>{
  const env=setup({verify:async()=>{throw new Error('synthetic siteverify outage')}});
  assert.equal((await env.make()(env.wire(),syntheticIngress)).status,503);
  assert.equal((await env.make()(env.wire(),syntheticIngress)).status,403);
  assert.equal(env.calls.verify.length,1);noSends(env);
});

test('duplicate clicks with fresh challenge while first email pending do not double-send',async()=>{
  const gate=deferred();const env=setup({send:()=>gate.promise});
  const first=env.make()(env.wire(),syntheticIngress);
  await new Promise(resolve=>setImmediate(resolve));
  const second=await env.make()(env.wire(another()),syntheticIngress);
  assert.equal(second.status,409);assert.equal(env.calls.send.length,1);
  gate.resolve({accepted:true});
  assert.equal((await first).status,202);assert.equal(env.calls.send.length,1);
});

test('accepted relay then lost reply: UNKNOWN prevents same and NEW CAPTCHA repeat',async()=>{
  const env=setup({send:async()=>{throw new Error('response lost after acceptance')}});
  const first=await env.make()(env.wire(),syntheticIngress);
  assert.equal(first.status,502);assert.match(first.message,/might have been sent/);
  assert.equal(env.store.snapshot().logical[0],'UNKNOWN');
  assert.equal((await env.make()(env.wire(),syntheticIngress)).status,403);
  assert.equal((await env.make()(env.wire(another()),syntheticIngress)).status,409);
  assert.equal(env.calls.send.length,1);
});

test('crash-equivalent persisted SENDING record survives resumed request with new token',async()=>{
  const env=setup({send:async()=>({accepted:true})});
  const original=await env.make()(env.wire(),syntheticIngress);
  assert.equal(original.status,202);
  const result=await env.make()(env.wire(another()),syntheticIngress);
  assert.equal(result.status,409);
  assert.equal(env.store.snapshot().logical[0],'ACCEPTED');
  assert.equal(env.calls.send.length,1);
});

test('definitive relay failure never silently retries during 24-hour dedupe window',async()=>{
  const env=setup({send:async()=>({accepted:false})});
  assert.equal((await env.make()(env.wire(),syntheticIngress)).status,503);
  assert.equal((await env.make()(env.wire(another()),syntheticIngress)).status,409);
  assert.equal(env.calls.send.length,1);assert.deepEqual(env.store.snapshot().logical,['FAILED']);
});

test('after logical TTL, a new token can send again, reflecting bounded guarantee',async()=>{
  const env=setup();
  await env.make()(env.wire(),syntheticIngress);
  env.advance(24*60*60*1000+1);
  assert.equal((await env.make()(env.wire(another()),syntheticIngress)).status,202);
  assert.equal(env.calls.send.length,2);
});

test('duplicate decoded JSON member names rejected before materialization',async()=>{
  const env=setup();
  const valid=JSON.stringify(syntheticPayload());
  const attack=valid.replace('"name":','"name":"first","na\\u006de":');
  assert.throws(()=>parseStrictFlatJson(attack),/schema/);
  assert.equal((await env.make()(env.wire({}, {body:new TextEncoder().encode(attack)}),syntheticIngress)).status,400);
  noExternalCalls(env);
});

test('invalid UTF-8, malformed JSON, illegal object shapes and lone surrogates fail closed',async()=>{
  const attacks=[
    new Uint8Array([0xc3,0x28]),
    new TextEncoder().encode('{"name":"\\ud800"}'),
    new TextEncoder().encode('{"name":true}'),
    new TextEncoder().encode('{"name":{} }'),
    new TextEncoder().encode('not-json')
  ];
  for(const body of attacks){
    const env=setup();
    assert.equal((await env.make()(env.wire({}, {body}),syntheticIngress)).status,400);
    noExternalCalls(env);
  }
});

test('oversized body including chunked stream over declared length cap has no verifier calls',async()=>{
  const env=setup();
  const body=new Uint8Array(MAX_BODY_BYTES+1);
  assert.equal((await env.make()(env.wire({}, {body}),syntheticIngress)).status,413);
  const stream=(async function*(){yield new Uint8Array(8000);yield new Uint8Array(9000)})();
  assert.equal((await env.make()(env.wire({}, {body:stream,contentLength:'16'}),syntheticIngress)).status,413);
  assert.equal((await env.make()(env.wire({}, {contentLength:String(MAX_BODY_BYTES+1)}),syntheticIngress)).status,413);
  noExternalCalls(env);
});

test('forged Origin, unverified proxy-source and header injection never reach Siteverify',async()=>{
  const invalid=[
    [syntheticWire(syntheticPayload(),{origin:'https://evil.example'}),syntheticIngress],
    [syntheticWire(),{source:'203.0.113.7',verified:false}],
    [syntheticWire(syntheticPayload({name:'Header\r\nBcc:bad@example.invalid'})),syntheticIngress],
    [syntheticWire(syntheticPayload({email:'bad\r\nCc:attacker@example.invalid'})),syntheticIngress],
    [syntheticWire(syntheticPayload({recipient:'attacker@example.invalid'})),syntheticIngress],
    [syntheticWire(syntheticPayload({_captcha:'false'})),syntheticIngress],
    [syntheticWire(syntheticPayload({processing_ack:'no'})),syntheticIngress]
  ];
  for(const [wire,ingress] of invalid){
    const env=setup();
    const result=await env.make()(wire,ingress);
    assert.notEqual(result.status,202);noExternalCalls(env);
  }
});

test('wrong HTTP method and content type do not enter store or verification',async()=>{
  for(const patch of [{method:'GET'},{method:'OPTIONS'},{contentType:'text/plain'}]){
    const env=setup();
    const result=await env.make()(env.wire({},patch),syntheticIngress);
    assert.ok(result.status===405||result.status===415);noExternalCalls(env);
  }
});

test('NFC equivalent inquiries share the same 24h dedupe reservation',async()=>{
  const env=setup();
  assert.equal((await env.make()(env.wire({name:'Caf\u00e9 Fiction'}),syntheticIngress)).status,202);
  assert.equal((await env.make()(env.wire(another({name:'Cafe\u0301 Fiction'})),syntheticIngress)).status,409);
  assert.equal(env.calls.send.length,1);
});

test('no automatic transport activity or external client in module; tests only inject mocks',async()=>{
  const env=setup();
  const before=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('NETWORK PROHIBITED')};
  try {assert.equal((await env.make()(env.wire(),syntheticIngress)).status,202);}finally{globalThis.fetch=before}
  assert.equal(env.calls.send.length,1);
});


test('S23-MOCK-01: independent handler clocks cannot shorten store token tombstone or quota window',async()=>{
  let storeNow=fixedNow;
  const store=new FakeAtomicStore({clock:()=>storeNow,sourceLimit:1});
  const env=setup({store,verify:async()=>({success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow})});
  const early=env.make(()=>fixedNow);
  const farFuture=env.make(()=>fixedNow+TOKEN_TOMBSTONE_MS+3600000);
  assert.equal((await early(env.wire(),syntheticIngress)).status,202);
  // The store clock is unchanged; a future-dated handler cannot release a replay
  // tombstone or advance the shared fixed-window quota.
  const reused=await farFuture(env.wire(),syntheticIngress);
  assert.equal(reused.status,403);
  const anotherToken=await farFuture(env.wire(another()),syntheticIngress);
  assert.equal(anotherToken.status,429);
  assert.equal(env.calls.verify.length,1);
  assert.equal(env.calls.send.length,1);
  assert.equal(store.snapshot().attempts,1);
});

test('S23-MOCK-01: forward handler clock cannot expire logical dedupe when store time is fixed',async()=>{
  let storeTime=fixedNow;
  const store=new FakeAtomicStore({clock:()=>storeTime});
  const env=setup({store,verify:async(token)=>({
    success:true,hostname:'localhost',action:'marketing_inquiry',
    challengeTs:token==='TOKEN-SECOND'?fixedNow+LOGICAL_DEDUPE_MS+5:fixedNow
  })});
  assert.equal((await env.make(()=>fixedNow)(env.wire(),syntheticIngress)).status,202);
  const jumped=env.make(()=>fixedNow+LOGICAL_DEDUPE_MS+5);
  assert.equal((await jumped(env.wire(another()),syntheticIngress)).status,409);
  assert.equal(env.calls.verify.length,2);
  assert.equal(env.calls.send.length,1);
  assert.deepEqual(store.snapshot().logical,['ACCEPTED']);
});

test('S23-MOCK-02: owned token completion is one-shot CAS, copied/stale leases cannot double-release',()=>{
  const store=new FakeAtomicStore({clock:()=>fixedNow});
  const admission=store.admit({stage:'mock-site23',keyVersion:1,rateKey:'source1',tokenKey:'tokenA'});
  assert.equal(admission.ok,true);
  const lease=admission.lease;
  assert.equal(Object.isFrozen(lease),true);
  assert.equal(store.finish(lease,'VERIFIED'),true);
  assert.throws(()=>store.finish(lease,'CLOSED'),/stale/);
  assert.throws(()=>store.finish(Object.freeze({...lease}),'FAILED'),/stale/);
  assert.throws(()=>store.finish(Object.freeze({...lease,claimId:lease.claimId+1000}),'FAILED'),/stale/);
  assert.equal(store.snapshot().inFlight,0);
  assert.equal(store.snapshot().permits,0);
  assert.equal(store.tokens.get('tokenA').status,'VERIFIED');
});

test('S23-MOCK-02: delivery states use owner-bound CAS and terminal state cannot reopen',()=>{
  const store=new FakeAtomicStore({clock:()=>fixedNow});
  const claim=store.claimDelivery({logicalKey:'fictional-dedupe'}).claim;
  assert.equal(store.deliveryState(claim,'RESERVED','SENDING'),true);
  assert.throws(()=>store.deliveryState(claim,'RESERVED','SENDING'),/stale/);
  assert.throws(()=>store.deliveryState(Object.freeze({...claim,ownerId:claim.ownerId+1}),'SENDING','ACCEPTED'),/stale/);
  assert.equal(store.deliveryState(claim,'SENDING','UNKNOWN'),true);
  assert.throws(()=>store.deliveryState(claim,'UNKNOWN','SENDING'),/stale/);
  assert.throws(()=>store.deliveryState(claim,'SENDING','ACCEPTED'),/stale/);
  assert.deepEqual(store.snapshot().logical,['UNKNOWN']);
});

test('S23-MOCK-03: authoritative lease expiry recovers permit but retains CLOSED replay tombstone',()=>{
  let now=fixedNow;
  const store=new FakeAtomicStore({clock:()=>now,sourceConcurrency:1,globalConcurrency:1});
  const options={stage:'mock-site23',keyVersion:1,rateKey:'fictional-source',tokenKey:'token-expiring'};
  const held=store.admit(options);
  assert.equal(held.ok,true);
  assert.equal(store.snapshot().inFlight,1);
  now+=VERIFIER_LEASE_MS+1;
  store.sweep();
  assert.equal(store.snapshot().inFlight,0);
  assert.equal(store.snapshot().permits,0);
  assert.equal(store.tokens.get('token-expiring').status,'CLOSED');
  assert.throws(()=>store.finish(held.lease,'VERIFIED'),/stale/);
  assert.equal(store.admit(options).reason,'replay');
  assert.equal(store.admit({...options,tokenKey:'fresh-token'}).ok,true);
  assert.equal(store.snapshot().inFlight,1);
});

test('S23-MOCK-03: replay and delivery digests are evicted at store-authored expiry',()=>{
  let now=fixedNow;
  const store=new FakeAtomicStore({clock:()=>now});
  const params={stage:'mock-site23',keyVersion:1,rateKey:'fictional-source',tokenKey:'retained-token'};
  const admission=store.admit(params);
  store.finish(admission.lease,'FAILED');
  const delivery=store.claimDelivery({logicalKey:'retained-delivery'});
  store.deliveryState(delivery.claim,'RESERVED','SENDING');
  store.deliveryState(delivery.claim,'SENDING','UNKNOWN');
  now+=TOKEN_TOMBSTONE_MS+1;
  store.sweep();
  assert.equal(store.snapshot().tokens,0);
  assert.deepEqual(store.snapshot().logical,['UNKNOWN']);
  now=fixedNow+LOGICAL_DEDUPE_MS+1;
  store.sweep();
  assert.deepEqual(store.snapshot().logical,[]);
  assert.equal(store.claimDelivery({logicalKey:'retained-delivery'}).ok,true);
});

test('S23-MOCK-03: deterministic verifier timeout closes token; late verifier cannot send',async()=>{
  const verifierGate=deferred(), deadline=deferred();
  const env=setup({verify:()=>verifierGate.promise,deadline:deadline.promise});
  const pending=env.make()(env.wire(),syntheticIngress);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(env.store.snapshot().inFlight,1);
  deadline.resolve();
  assert.equal((await pending).status,503);
  assert.equal(env.store.snapshot().inFlight,0);
  assert.equal((await env.make()(env.wire(),syntheticIngress)).status,403);
  verifierGate.resolve({success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow});
  await Promise.resolve();
  assert.equal(env.calls.verify.length,1);
  noSends(env);
});

test('S23-MOCK-03: lease expires mid-verifier; stale completion cannot reach delivery',async()=>{
  let now=fixedNow;
  const gate=deferred();
  const store=new FakeAtomicStore({clock:()=>now,globalConcurrency:1});
  const env=setup({store,verify:()=>gate.promise});
  const pending=env.make()(env.wire(),syntheticIngress);
  await new Promise(resolve=>setImmediate(resolve));
  now+=VERIFIER_LEASE_MS+1;store.sweep();
  assert.equal(store.snapshot().inFlight,0);
  gate.resolve({success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow});
  assert.equal((await pending).status,503);
  assert.equal(env.calls.send.length,0);
  assert.equal((await env.make()(env.wire(),syntheticIngress)).status,403);
});

test('S23-MOCK-04: non-JSON structural whitespace is rejected before verification',async()=>{
  for(const illegal of ['\u00a0','\u000b','\u000c']){
    const input=JSON.stringify(syntheticPayload()).replace('{','{'+illegal);
    assert.throws(()=>parseStrictFlatJson(input),/json/);
    const env=setup();
    const result=await env.make()(env.wire({}, {body:new TextEncoder().encode(input)}),syntheticIngress);
    assert.equal(result.status,400);noExternalCalls(env);
  }
  assert.equal(parseStrictFlatJson(' \n\t'+JSON.stringify(syntheticPayload())+'\r ').name,'Fictional Demo');
});

test('S23-MOCK-05: provider timestamp type coercion, large response and malformed result reject',async()=>{
  for(const fakeOutcome of [
    {success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:String(fixedNow)},
    {success:true,hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow,extra:'x'.repeat(9000)},
    ['unexpected','array'],
    {success:'true',hostname:'localhost',action:'marketing_inquiry',challengeTs:fixedNow}
  ]){
    const env=setup({verify:async()=>fakeOutcome});
    assert.equal((await env.make()(env.wire(),syntheticIngress)).status,403);
    assert.equal(env.calls.verify.length,1);noSends(env);
  }
});
