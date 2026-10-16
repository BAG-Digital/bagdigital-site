import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SqliteStageCoordinator} from '../intake/stage2/sql-coordinator.mjs';
import {createStage2Handler,strictFlatJson} from '../intake/stage2/guarded-handler.mjs';

const NOW=Date.parse('2026-10-16T20:00:00Z');
const origin='https://bagdigital.tech';
const payload=()=>({
  name:'Synthetic QA',email:'qa@example.invalid',business:'',
  service:'website',message:'No customer data is in this synthetic inquiry.',
  processing_ack:'yes',challenge_token:'synthetic-challenge',
  request_id:'11111111-2222-4333-8444-555555555555'
});
const request=(obj=payload(),extra={})=>new Request('https://intake.example.invalid/inquiry',{
  method:'POST',headers:{'content-type':'application/json',origin,...extra},body:typeof obj==='string'?obj:JSON.stringify(obj)
});
const config={
  enabled:true,stage:'stage-synthetic',keyVersion:1,
  allowedOrigin:origin,expectedHostname:'bagdigital.tech',expectedAction:'marketing_inquiry',
  rateSecret:'synthetic-stage2-rate-secret-aaaaaaaa',
  tokenSecret:'synthetic-stage2-token-secret-aaaaaaa',
  deliverySecret:'synthetic-stage2-delivery-secret-aaa',
  from:'sender@example.invalid',to:'inbox@example.invalid'
};
const ingress={verified:true,source:'203.0.113.42'};
function fixture({verify,send}={}){
  const db=new DatabaseSync(':memory:');
  const sql={exec(text,...params){
    const stmt=db.prepare(text);
    return /^\s*SELECT/i.test(text)?{toArray:()=>stmt.all(...params)}:(stmt.run(...params),{toArray:()=>[]});
  }};
  const storage={sql,transactionSync(fn){
    db.exec('BEGIN IMMEDIATE');
    try{const value=fn();db.exec('COMMIT');return value}
    catch(e){db.exec('ROLLBACK');throw e}
  }};
  const store=new SqliteStageCoordinator(storage,{stage:'stage-synthetic',keyVersion:1});
  let sends=0,checks=0;
  const verifier={verify:async token=>{
    checks++;return verify?await verify(token):{success:true,hostname:'bagdigital.tech',
      action:'marketing_inquiry',challengeTs:NOW}
  }};
  const sender={send:async args=>{sends++;return send?await send(args):{accepted:true}}};
  const handler=createStage2Handler({store,verifier,sender,config,clock:()=>NOW});
  return {handler,store,get sends(){return sends},get checks(){return checks}};
}
async function body(r){return {status:r.status,...await r.json()};}

test('strict JSON scanner rejects duplicate escaped aliases and illegal structural whitespace',()=>{
  assert.throws(()=>strictFlatJson('{"name":"ok","na\\u006de":"same"}'));
  assert.throws(()=>strictFlatJson('{\u00a0"name":"ok"}'));
  assert.throws(()=>strictFlatJson('{"name":null}'));
});

test('accepted synthetic inquiry consumes one challenge and one bounded mail attempt',async()=>{
  const x=fixture();
  const r=await body(await x.handler(request(),ingress));
  assert.equal(r.status,202);
  assert.equal(r.code,'RELAY_ACCEPTED');
  assert.equal(x.sends,1);assert.equal(x.checks,1);
  assert.equal((await x.handler(request(),ingress)).status,403);
  assert.equal(x.sends,1);assert.equal(x.checks,1);
});

test('server-side consent and unknown fields reject before verifier or relay',async()=>{
  const x=fixture();
  for(const change of [{processing_ack:'no'},{processing_ack:''},{_captcha:'false'},{
    email:'evil@example.invalid\r\nBcc:steal@example.invalid'
  },{message:'short'}]){
    const r=await x.handler(request({...payload(),...change}),ingress);
    assert.equal(r.status,400);
  }
  assert.equal(x.sends,0);assert.equal(x.checks,0);
});

test('hostile body and spoofed unverified ingress always reject without external calls',async()=>{
  const x=fixture();
  assert.equal((await x.handler(request(payload()),{verified:false,source:'203.0.113.42'})).status,503);
  assert.equal((await x.handler(request(payload(),{origin:'https://evil.invalid'}),ingress)).status,403);
  const json='{"name":"a","na\\u006de":"alias"}';
  assert.equal((await x.handler(request(json),ingress)).status,400);
  assert.equal(x.checks,0);
});

test('oversized body responds 413 without invoking trusted dependencies',async()=>{
  const x=fixture();
  const large=request({...payload(),message:'X'.repeat(18000)});
  assert.equal((await x.handler(large,ingress)).status,413);
  assert.equal(x.checks,0);
});

test('invalid provider host or age stops delivery and consumes token',async()=>{
  const x=fixture({verify:async()=>({success:true,hostname:'evil.invalid',
    action:'marketing_inquiry',challengeTs:NOW})});
  assert.equal((await x.handler(request(),ingress)).status,403);
  assert.equal(x.sends,0);
  assert.equal((await x.handler(request(),ingress)).status,403);
  assert.equal(x.checks,1);
});

test('relay accepted but response lost results UNKNOWN and no repeated delivery',async()=>{
  const x=fixture({send:async()=>{throw Error('synthetic lost response')}});
  const first=await body(await x.handler(request(),ingress));
  assert.equal(first.status,502);assert.equal(first.code,'DELIVERY_UNKNOWN');
  const second=await body(await x.handler(request({...payload(),challenge_token:'fresh-token'}),ingress));
  assert.equal(second.status,409);
  assert.equal(x.sends,1);
});

test('sender definite rejection still prevents an identical logical replay',async()=>{
  const x=fixture({send:async()=>({accepted:false,definite:true})});
  assert.equal((await x.handler(request(),ingress)).status,503);
  assert.equal((await x.handler(request({...payload(),challenge_token:'fresh-token'}),ingress)).status,409);
  assert.equal(x.sends,1);
});

test('disabled configuration and store outage fail before provider calls',async()=>{
  const x=fixture();
  const disabled=createStage2Handler({store:x.store,verifier:{verify:()=>{}},sender:{send:()=>{}},
    config:{...config,enabled:false}});
  assert.equal((await disabled(request(),ingress)).status,503);
  x.store.admit=async()=>{throw Error('simulated store outage')};
  assert.equal((await x.handler(request(),ingress)).status,503);
  assert.equal(x.checks,0);assert.equal(x.sends,0);
});

test('two handler calls racing on one token never trigger more than one verifier',async()=>{
  const x=fixture({verify:async()=>new Promise(resolve=>setTimeout(
    ()=>resolve({success:true,hostname:'bagdigital.tech',
      action:'marketing_inquiry',challengeTs:NOW}),30))});
  const results=await Promise.all([x.handler(request(),ingress),x.handler(request(),ingress)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[202,403]);
  assert.equal(x.checks,1);assert.equal(x.sends,1);
});
