/**
 * Site #26 / Stage 2 candidate guarded intake handler.
 * No live route, credentials or vendor setup. All dependencies are injected;
 * independently reviewed host ingress/DO/Turnstile/relay integration is required.
 */
const MAX_BODY=16*1024;
const SERVICES=new Set(['website','workflow-planning','integration-planning','support']);
const FIELDS=new Set(['name','email','business','service','message','processing_ack','challenge_token','request_id']);
const uuid4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder=new TextEncoder();
const invalidUnicode=s=>/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(s);
const size=s=>encoder.encode(s).byteLength;
const answer=(status,code,message,origin)=>new Response(JSON.stringify({code,message}),{
  status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
    ...(status===405?{'Allow':'POST'}:{}),
    ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}
});
const bad=(origin)=>answer(400,'INVALID_INPUT','Check the form fields and try again.',origin);
const offline=(origin)=>answer(503,'UNAVAILABLE','The form is unavailable. Please contact us directly.',origin);
const uncertain=(origin)=>answer(409,'POSSIBLY_SENT','We cannot confirm delivery. Please contact us directly if urgent.',origin);

export class Oversize extends Error {}

export async function readBody(request){
  const declared=request.headers.get('content-length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY))throw new Oversize();
  if(!request.body?.getReader)throw Error('body');
  const chunks=[];let count=0;const reader=request.body.getReader();
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      if(!(value instanceof Uint8Array))throw Error('body');
      count+=value.byteLength;
      if(count>MAX_BODY)throw new Oversize();
      chunks.push(value);
    }
  }finally{
    if(count>MAX_BODY)try{await reader.cancel()}catch{}
    reader.releaseLock();
  }
  const all=new Uint8Array(count);let offset=0;
  for(const part of chunks){all.set(part,offset);offset+=part.byteLength}
  return new TextDecoder('utf-8',{fatal:true}).decode(all);
}

/** Flat string-only JSON scanner: reject escaped-alias duplicate keys pre-materialization. */
export function strictFlatJson(raw){
  let i=0;
  const ws=()=>{while(/[ \t\r\n]/.test(raw[i]??'\0'))i++};
  const expect=c=>{ws();if(raw[i]!==c)throw Error('json');i++};
  const str=()=>{
    ws();if(raw[i]!=='"')throw Error('json');
    const start=i++;
    while(i<raw.length){
      const c=raw[i++];
      if(c==='\\'){if(i>=raw.length)throw Error('json');i++}
      else if(c==='"'){
        const result=JSON.parse(raw.slice(start,i));
        if(invalidUnicode(result))throw Error('unicode');
        return result;
      }else if(c.charCodeAt(0)<32)throw Error('json');
    }
    throw Error('json');
  };
  expect('{');ws();
  const value=Object.create(null),seen=new Set();
  if(raw[i]==='}')i++;
  else{
    while(true){
      const k=str();if(seen.has(k)||!FIELDS.has(k))throw Error('schema');
      seen.add(k);expect(':');value[k]=str();ws();
      if(raw[i]==='}'){i++;break}
      expect(',');
    }
  }
  ws();if(i!==raw.length)throw Error('json');
  return value;
}
const cp=s=>[...s].length;
export function normalizeInput(v){
  if(['name','email','service','message','processing_ack','challenge_token','request_id'].some(k=>typeof v[k]!=='string'))throw Error('schema');
  if(v.business!==undefined&&typeof v.business!=='string')throw Error('schema');
  const name=v.name.trim().normalize('NFC'),email=v.email.trim().toLowerCase(),
    business=(v.business??'').trim().normalize('NFC'),message=v.message.trim().normalize('NFC'),
    token=v.challenge_token;
  if(v.processing_ack!=='yes'||!uuid4.test(v.request_id)||!SERVICES.has(v.service))throw Error('schema');
  if(!/^[^\s@<>(),;:\[\]\\"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)||email.length>254)throw Error('schema');
  if(cp(name)<1||cp(name)>100||size(name)>400||cp(business)>100||size(business)>400||
     cp(message)<20||cp(message)>2000||size(message)>8000||
     cp(token)<1||cp(token)>2048||size(token)>2048||
     !/^[\x21-\x7e]+$/.test(token))throw Error('schema');
  if(/[\r\n\u0000-\u001f\u007f]/.test(name+business+email+token)||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message))throw Error('schema');
  return {name,email,business,service:v.service,message,processing_ack:'yes',token,requestId:v.request_id};
}
function canon(v){
  return [v.name,v.email,v.business,v.service,v.message,v.processing_ack]
    .map(s=>size(s)+':'+s).join('|');
}
export async function hmac(secret,namespace,value){
  if(typeof secret!=='string'||secret.length<32)throw Error('secret');
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(namespace+'\0'+value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function createStage2Handler({store,verifier,sender,config,clock=()=>Date.now(),logger=()=>{}}){
  return async function handle(request,ingress){
    // Security controls are server-owned, not inferred from browser validation.
    const origin=config?.allowedOrigin;
    if(config?.enabled!==true||!/^stage-[a-z0-9-]+$/.test(config?.stage||'')||
       !/^[a-z0-9.-]+$/.test(config?.expectedHostname||'')||
       config?.expectedAction!=='marketing_inquiry'||!config?.from||!config?.to||
       !config?.rateSecret||!config?.tokenSecret||!config?.deliverySecret||
       !Number.isInteger(config?.keyVersion)||!store||!verifier||!sender)return offline();
    const response=(s,c,m)=>answer(s,c,m,origin);
    if(new URL(request.url).pathname!=='/inquiry')return response(404,'NOT_FOUND','Not found.');
    if(request.method!=='POST')return response(405,'METHOD','POST required.');
    if(request.headers.get('content-type')!=='application/json')return response(415,'CONTENT_TYPE','JSON required.');
    if(request.headers.get('origin')!==origin)return response(403,'ORIGIN','Origin not permitted.');
    if(ingress?.verified!==true||typeof ingress.source!=='string'||!/^[a-z0-9:.]{3,64}$/i.test(ingress.source))return offline(origin);
    let input;
    try{input=normalizeInput(strictFlatJson(await readBody(request)))}
    catch(error){return error instanceof Oversize?response(413,'PAYLOAD_TOO_LARGE','The form content is too large.'):bad(origin)}
    let lease=null,logicalClaim=null;
    try{
      const rateKey=await hmac(config.rateSecret,config.stage+':rate:v'+config.keyVersion,ingress.source);
      const tokenKey=await hmac(config.tokenSecret,config.stage+':token:v'+config.keyVersion,input.token);
      const admitted=await store.admit({stage:config.stage,keyVersion:config.keyVersion,rateKey,tokenKey});
      if(!admitted.ok)return admitted.reason==='limit'?response(429,'THROTTLED','Please try again later.'):
        admitted.reason==='replay'?response(403,'CHALLENGE_REJECTED','Verification failed. Please start a new inquiry.'):offline(origin);
      lease=admitted.lease;
      let verification;
      try{verification=await verifier.verify(input.token)}catch{
        await store.finish(lease,'CLOSED');lease=null;return offline(origin);
      }
      const age=clock()-verification?.challengeTs;
      if(verification?.success!==true||verification.hostname!==config.expectedHostname||
         verification.action!==config.expectedAction||!Number.isFinite(age)||age< -5000||age>300000){
        await store.finish(lease,'FAILED');lease=null;
        return response(403,'CHALLENGE_REJECTED','Verification failed. Please start again.');
      }
      const confirmed=await store.finish(lease,'VERIFIED');lease=null;
      if(confirmed!==true)return offline(origin);
      const logicalKey=await hmac(config.deliverySecret,config.stage+':canonical:v'+config.keyVersion,canon(input));
      const reserved=await store.claimDelivery({stage:config.stage,logicalKey});
      if(!reserved.ok)return uncertain(origin);
      logicalClaim=reserved.claim;
      if(await store.deliveryState(logicalClaim,'RESERVED','SENDING')!==true)return offline(origin);
      let delivered;
      try{
        delivered=await sender.send({from:config.from,to:config.to,replyTo:input.email,
          idempotencyKey:logicalKey,
          text:[input.name,input.email,input.business,input.service,input.message].join('\n')});
      }catch{
        try{await store.deliveryState(logicalClaim,'SENDING','UNKNOWN')}catch{}
        return response(502,'DELIVERY_UNKNOWN','We could not confirm delivery. Your inquiry might have been sent.');
      }
      try{
        const next=delivered?.accepted===true?'ACCEPTED':delivered?.definite===true?'FAILED':'UNKNOWN';
        if(await store.deliveryState(logicalClaim,'SENDING',next)!==true)return response(502,'DELIVERY_UNKNOWN','Delivery could not be confirmed.');
      }catch{return response(502,'DELIVERY_UNKNOWN','Delivery could not be confirmed.')}
      if(delivered?.accepted!==true)return offline(origin);
      logger({category:'relay_accepted'}); // No payload, token, or IP.
      return response(202,'RELAY_ACCEPTED','The mail service accepted your inquiry; inbox delivery is not guaranteed.');
    }catch{return offline(origin)}
    finally{if(lease!==null)try{await store.finish(lease,'CLOSED')}catch{}}
  };
}
