import test from 'node:test';
import assert from 'node:assert/strict';
import {createTurnstileVerifier,createFixedRelay,AdapterFailure} from '../intake/stage2/provider-adapters.mjs';

const response=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers});
const stage=()=>({success:true,hostname:'preview.example.invalid',action:'marketing_inquiry',challenge_ts:'2026-10-16T20:00:00Z'});
const sender=fetchImpl=>createFixedRelay({fetchImpl,apiKey:'SYNTHETIC_NEVER_LIVE',from:'qa@example.invalid',to:'inbox@example.invalid',timeoutMs:120});
const mail={
  from:'qa@example.invalid',to:'inbox@example.invalid',replyTo:'contact@example.invalid',
  text:'Synthetic inquiry body with no real customer data',idempotencyKey:'a'.repeat(64)
};

test('siteverify success has typed, parseable challenge timestamp',async()=>{
  let calls=0;
  const verifier=createTurnstileVerifier({
    fetchImpl:async(url,init)=>{
      calls++;
      assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
      assert.equal(init.redirect,'error');
      assert.equal(init.method,'POST');
      assert.equal(init.body.get('response'),'synthetic-token');
      assert.equal(init.body.get('secret'),'SYNTHETIC_TEST_ONLY');
      return response(stage());
    },secret:'SYNTHETIC_TEST_ONLY'
  });
  const r=await verifier.verify('synthetic-token');
  assert.deepEqual(r,{success:true,hostname:'preview.example.invalid',action:'marketing_inquiry',challengeTs:Date.parse('2026-10-16T20:00:00Z')});
  assert.equal(calls,1);
});

test('siteverify requires explicit secret and valid token before egress',async()=>{
  assert.throws(()=>createTurnstileVerifier({fetchImpl:()=>{},secret:''}),AdapterFailure);
  let count=0;
  const v=createTurnstileVerifier({fetchImpl:()=>{count++;return response(stage());},secret:'synthetic'});
  await assert.rejects(v.verify('bad\nheader'),AdapterFailure);
  assert.equal(count,0);
});

test('siteverify rejects absent/malformed/typed timestamp or response',async()=>{
  for(const body of [
    {...stage(),challenge_ts:Date.now()},
    {...stage(),challenge_ts:'not-a-date'},
    {...stage(),success:'true'},
    {...stage(),hostname:null},
    [],
    null
  ]){
    let count=0;
    const v=createTurnstileVerifier({secret:'synthetic',fetchImpl:async()=>{count++;return response(body)}});
    await assert.rejects(v.verify('synthetic-token'),AdapterFailure);
    assert.equal(count,1);
  }
});

test('siteverify rejects oversize streamed response',async()=>{
  const v=createTurnstileVerifier({secret:'synthetic',fetchImpl:async()=>response({...stage(),unexpected:'X'.repeat(9000)})});
  await assert.rejects(v.verify('synthetic-token'),e=>e.kind==='response-size');
});

test('siteverify rejects overlarge declared content-length',async()=>{
  const v=createTurnstileVerifier({secret:'synthetic',fetchImpl:async()=>response(stage(),200,{'content-length':'9000'})});
  await assert.rejects(v.verify('synthetic-token'),e=>e.kind==='response-size');
});

test('siteverify rejects non-200 response even when body says success',async()=>{
  const v=createTurnstileVerifier({secret:'synthetic',fetchImpl:async()=>response(stage(),403)});
  await assert.rejects(v.verify('synthetic-token'),e=>e.kind==='verification-http');
});

test('siteverify deadline is hard even if transport ignores abort signal',async()=>{
  let count=0;
  const v=createTurnstileVerifier({secret:'synthetic',timeoutMs:100,
    fetchImpl:()=>{count++;return new Promise(()=>{});}});
  await assert.rejects(v.verify('synthetic-token'),e=>e.kind==='timeout');
  assert.equal(count,1);
});

test('relay keeps trusted fixed receiver and envelope, one attempt only',async()=>{
  let count=0;
  const relay=sender(async(url,init)=>{
    count++;
    assert.equal(url,'https://api.resend.com/emails');
    assert.equal(init.redirect,'error');
    assert.equal(init.headers['Idempotency-Key'],'a'.repeat(64));
    const msg=JSON.parse(init.body);
    assert.deepEqual(msg.to,['inbox@example.invalid']);
    assert.equal(msg.from,'qa@example.invalid');
    assert.equal(msg.reply_to,'contact@example.invalid');
    assert.equal(msg.subject,'BAGDigital website inquiry');
    return response({id:'synthetic-email-123'});
  });
  assert.deepEqual(await relay.send(mail),{accepted:true});
  assert.equal(count,1);
});

test('relay never accepts caller-controlled destination or injected reply-to',async()=>{
  let count=0;
  const relay=sender(async()=>{count++;return response({id:'x'});});
  for(const bad of [{to:'elsewhere@example.invalid'},{from:'other@example.invalid'},
    {replyTo:'attacker@example.invalid\r\nBcc:a@example.invalid'},
    {idempotencyKey:'oops'}, {text:''}]){
    await assert.rejects(relay.send({...mail,...bad}),e=>e.kind==='relay-envelope');
  }
  assert.equal(count,0);
});

test('relay definite 4xx is a terminal rejection without retry',async()=>{
  let count=0;
  const relay=sender(async()=>{count++;return response({name:'invalid'},422)});
  assert.deepEqual(await relay.send(mail),{accepted:false,definite:true});
  assert.equal(count,1);
});

test('relay ambiguous 5xx is thrown and never automatically retried',async()=>{
  let count=0;
  const relay=sender(async()=>{count++;return response({message:'unavailable'},503)});
  await assert.rejects(relay.send(mail),e=>e.kind==='delivery-ambiguous');
  assert.equal(count,1);
});

test('relay hard sender timeout leaves uncertainty with one attempt',async()=>{
  let count=0;
  const relay=sender(async()=>{count++;return new Promise(()=>{});});
  await assert.rejects(relay.send(mail),e=>e.kind==='timeout');
  assert.equal(count,1);
});

test('relay rejects malformed success response and oversized body',async()=>{
  for(const body of [{id:123}, {}, {id:'x'.repeat(5000)}]){
    const relay=sender(async()=>response(body));
    await assert.rejects(relay.send(mail),AdapterFailure);
  }
});

test('no secrets or messages are logged from the adapters',async()=>{
  let logged='';
  const oldLog=console.log;
  console.log=(...x)=>{logged+=x.join(' ')};
  try{
    const relay=sender(async()=>{throw Error('SYNTHETIC_NEVER_LIVE');});
    await assert.rejects(relay.send(mail),AdapterFailure);
  }finally{console.log=oldLog}
  assert.equal(logged,'');
});
