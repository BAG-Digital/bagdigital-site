import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerEntrypoint} from '../intake/stage2/worker-entrypoint.mjs';

// These tests execute the same real entrypoint function consumed by the
// Cloudflare-specific module. They do NOT run cloudflare:workers or workerd.
const origin='https://bagdigital.tech';
const stageEnv=()=>({
  INTAKE_ENABLED:'true',STAGE:'stage-preview',
  INTAKE_COORDINATOR:{getByName:()=>({admit(){}})},
  TURNSTILE_SECRET:'synthetic-secret',SEND_API_KEY:'synthetic-relay',
  TOKEN_HMAC_SECRET:'synthetic-token',RATE_HMAC_SECRET:'synthetic-rate',
  DELIVERY_HMAC_SECRET:'synthetic-delivery',KEY_VERSION:'1',
  VERIFIED_SENDER:'sender@example.invalid',FIXED_INBOX:'inbox@example.invalid',
  EXPECTED_HOSTNAME:'bagdigital.tech',ALLOWED_ORIGIN:origin
});
const request=(headers={},method='POST')=>new Request('https://intake.example.invalid/inquiry',{
  method,headers:{'origin':origin,'content-type':'application/json',...headers},
  ...(method==='POST'?{body:'{"synthetic":"not-a-real-message"}'}:{})
});
const syntheticAttestation=async()=>({
  verified:true,trustBasis:'independently-reviewed-edge',source:'192.0.2.42'
});
function harness({
  resolver=syntheticAttestation,store,verify,send,makeHandler
}={}){
  const calls={store:0,verifyCtor:0,sendCtor:0,handlerCtor:0,handle:0,fetch:0};
  const env=stageEnv();
  env.INTAKE_COORDINATOR={getByName(){
    calls.store++;
    if(store) return store();
    return {};
  }};
  const entry=createWorkerEntrypoint({
    resolveTrustedIngress:resolver,
    createVerifier(){calls.verifyCtor++;if(verify)return verify();return {verify:()=>{}}},
    createSender(){calls.sendCtor++;if(send)return send();return {send:()=>{}}},
    createHandler(){calls.handlerCtor++;
      if(makeHandler)return makeHandler();
      return async()=>{calls.handle++;return new Response('synthetic handler only',{status:202})};
    },
    fetchImpl(){calls.fetch++;throw Error('network forbidden')}
  });
  return {entry,env,calls};
}
async function assertSafe503(response){
  assert.equal(response.status,503);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('access-control-allow-origin'),origin);
  const text=await response.text();
  assert.doesNotMatch(text,/synthetic-secret|stack|ReferenceError|noStore|API_KEY/i);
}

test('S26-01: Durable Object stub failure is controlled 503, not undefined fallback',async()=>{
  const x=harness({store:()=>{throw Error('synthetic coordinator init failure')}}); 
  await assertSafe503(await x.entry.fetch(request(),x.env));
  assert.equal(x.calls.store,1);assert.equal(x.calls.verifyCtor,0);
  assert.equal(x.calls.sendCtor,0);assert.equal(x.calls.fetch,0);
});
test('S26-01: Turnstile and email adapter constructor failures are controlled 503',async()=>{
  for(const failure of ['verify','send']){
    const x=harness({[failure]:()=>{throw Error('synthetic secret failure')}});
    await assertSafe503(await x.entry.fetch(request(),x.env));
    assert.equal(x.calls.handle,0);assert.equal(x.calls.fetch,0);
  }
});
test('S26-01: injected handler synchronous throw and promise rejection return controlled 503',async()=>{
  for(const makeHandler of [
    ()=>{throw Error('synthetic build handler error')},
    ()=>async()=>{throw Error('synthetic handler rejected')}
  ]){
    const x=harness({makeHandler});
    await assertSafe503(await x.entry.fetch(request(),x.env));
    assert.equal(x.calls.fetch,0);
  }
});
test('S26-02: request.cf + forged CF-Connecting-IP/X-Real-IP NEVER attest by themselves',async()=>{
  const r=request({'cf-connecting-ip':'203.0.113.66','x-real-ip':'203.0.113.77'});
  Object.defineProperty(r,'cf',{value:{country:'US'},configurable:true});
  // Exactly the production entrypoint configuration: NO secure resolver.
  const x=harness({resolver:undefined});
  // harness default override is synthetic when undefined; use explicit null
  const entry=createWorkerEntrypoint({
    createHandler:()=>{throw Error('MUST NOT RUN')},
    createVerifier:()=>{throw Error('MUST NOT RUN')},
    createSender:()=>{throw Error('MUST NOT RUN')},
    fetchImpl:()=>{throw Error('MUST NOT RUN')}
  });
  await assertSafe503(await entry.fetch(r,x.env));
  assert.equal(x.calls.store,0);assert.equal(x.calls.fetch,0);
});
test('S26-02: same-zone Worker subrequest or missing/modified provenance fails closed',async()=>{
  const bad=[
    undefined,
    null,
    {verified:false,trustBasis:'independently-reviewed-edge',source:'203.0.113.10'},
    {verified:true,trustBasis:'http-header-presence',source:'203.0.113.10'},
    {verified:true,trustBasis:'independently-reviewed-edge',source:'malicious, 203.0.113.2'},
    {verified:true,trustBasis:'independently-reviewed-edge',source:''}
  ];
  for(const attestation of bad){
    const x=harness({resolver:async()=>attestation});
    const r=request({'cf-connecting-ip':'203.0.113.4','x-real-ip':'198.51.100.2'});
    Object.defineProperty(r,'cf',{value:{country:'US'}});
    await assertSafe503(await x.entry.fetch(r,x.env));
    assert.equal(x.calls.store,0);assert.equal(x.calls.fetch,0);
  }
});
test('S26-02: server-code simulated trusted ingress forwards fixed source, not spoofed header',async()=>{
  let observed;
  const x=harness({makeHandler:()=>async(_request,ingress)=>{
    observed=ingress;return new Response('synthetic-only',{status:202});
  }});
  const r=request({'cf-connecting-ip':'203.0.113.99','x-real-ip':'198.51.100.99'});
  Object.defineProperty(r,'cf',{value:{country:'US'}});
  const response=await x.entry.fetch(r,x.env);
  assert.equal(response.status,202);
  assert.deepEqual(observed,{verified:true,source:'192.0.2.42'});
  assert.equal(x.calls.fetch,0);
});
test('Worker default-off even when synthetically trusted, with zero handler or provider calls',async()=>{
  const x=harness();x.env.INTAKE_ENABLED='false';
  await assertSafe503(await x.entry.fetch(request(),x.env));
  assert.equal(x.calls.store,0);assert.equal(x.calls.verifyCtor,0);assert.equal(x.calls.fetch,0);
});
