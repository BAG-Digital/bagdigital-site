/**
 * Site #23: OFFLINE CONTRACT MODEL ONLY.
 *
 * No HTTP listener, provider SDK, env loading, persistence, cloud deploy adapter,
 * customer credentials or network I/O is present. All adapters MUST be injected.
 * Deliberately refuses use without explicit mock-only configuration.
 *
 * This is not a production-grade implementation of an atomic durable store.
 * See docs/site23/protected-inquiry-architecture.md in draft PR #24.
 */
import { createHmac } from 'node:crypto';

export const MAX_BODY_BYTES = 16 * 1024;
export const TOKEN_TOMBSTONE_MS = 15 * 60 * 1000;
export const LOGICAL_DEDUPE_MS = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const services = new Set(['website', 'workflow-planning', 'integration-planning', 'support']);
const fields = new Set(['name', 'email', 'business', 'service', 'message', 'processing_ack', 'challenge_token', 'request_id']);
const uuid4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function digest(secret, namespace, value) {
  return createHmac('sha256', secret).update(namespace).update('\0').update(value).digest('hex');
}
const codepoints = text => [...text].length;
const bytes = text => encoder.encode(text).length;
const hasLoneSurrogate = text => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text);

/**
 * Scan JSON members and decode EACH key before materialization. JSON.parse(raw
 * object) silently accepts duplicate members; use it only for one scanned string
 * literal at a time. Flat string-only schema prevents nested object pollution.
 */
export function parseStrictFlatJson(raw) {
  let i = 0;
  const white = () => { while (/\s/.test(raw[i] ?? '') && i < raw.length) i++; };
  const expect = char => { white(); if (raw[i] !== char) throw new Error('json'); i++; };
  const stringLiteral = () => {
    white();
    if (raw[i] !== '"') throw new Error('json');
    const start = i++;
    while (i < raw.length) {
      const c = raw[i++];
      if (c === '\\') {
        if (i >= raw.length) throw new Error('json');
        i++; // Skip escaped quote/backslash/character; JSON.parse validates escapes.
      } else if (c === '"') {
        const value = JSON.parse(raw.slice(start, i));
        if (hasLoneSurrogate(value)) throw new Error('unicode');
        return value;
      } else if (c.charCodeAt(0) < 32) throw new Error('json');
    }
    throw new Error('json');
  };
  expect('{');
  const out = Object.create(null);
  const seen = new Set();
  white();
  if (raw[i] === '}') i++;
  else {
    while (true) {
      const key = stringLiteral();
      if (seen.has(key) || !fields.has(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('schema');
      seen.add(key);
      expect(':');
      const value = stringLiteral(); // Numbers, arrays, booleans, objects rejected.
      out[key] = value;
      white();
      if (raw[i] === '}') { i++; break; }
      expect(',');
    }
  }
  white();
  if (i !== raw.length) throw new Error('json');
  return out;
}

async function boundedBody(body, headerLength) {
  if (headerLength !== undefined && (!/^\d+$/.test(String(headerLength)) || Number(headerLength) > MAX_BODY_BYTES)) throw new Error('size');
  let count = 0;
  const parts = [];
  let iterator;
  if (body instanceof Uint8Array) iterator = [body];
  else if (body && typeof body[Symbol.asyncIterator] === 'function') iterator = body;
  else throw new Error('body');
  for await (const piece of iterator) {
    if (!(piece instanceof Uint8Array)) throw new Error('body');
    count += piece.byteLength;
    if (count > MAX_BODY_BYTES) throw new Error('size');
    parts.push(piece);
  }
  const merged = new Uint8Array(count);
  let offset = 0;
  for (const part of parts) { merged.set(part, offset); offset += part.length; }
  return textDecoder.decode(merged);
}

function normalizeInput(fieldsObject) {
  const required = ['name', 'email', 'service', 'message', 'processing_ack', 'challenge_token', 'request_id'];
  if (required.some(k => typeof fieldsObject[k] !== 'string')) throw new Error('schema');
  const name = fieldsObject.name.trim().normalize('NFC');
  const business = (fieldsObject.business ?? '').trim().normalize('NFC');
  const email = fieldsObject.email.trim().toLowerCase();
  const service = fieldsObject.service;
  const message = fieldsObject.message.trim().normalize('NFC');
  const token = fieldsObject.challenge_token;
  const requestId = fieldsObject.request_id;
  if (![name, business, email, service, message, token, requestId].every(s => typeof s === 'string')) throw new Error('schema');
  if (fieldsObject.processing_ack !== 'yes') throw new Error('consent');
  if (!uuid4.test(requestId)) throw new Error('schema');
  if (!services.has(service) || !/^[^\s@<>(),;:\[\]\\"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) || email.length > 254) throw new Error('schema');
  if (codepoints(name) < 1 || codepoints(name) > 100 || bytes(name) > 400 ||
      codepoints(business) > 100 || bytes(business) > 400 ||
      codepoints(message) < 20 || codepoints(message) > 2000 || bytes(message) > 8000 ||
      codepoints(token) < 1 || codepoints(token) > 2048 || bytes(token) > 2048) throw new Error('schema');
  if (!/^[\x21-\x7e]+$/.test(token)) throw new Error('schema');
  if (/[\r\n\u0000-\u001f\u007f]/.test(name + business + email + token) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) throw new Error('schema');
  return { name, email, business, service, message, processing_ack:'yes', token, requestId };
}

function canonicalFields(input) {
  const parts = [input.name, input.email, input.business, input.service, input.message, input.processing_ack];
  return parts.map(s => String(bytes(s)) + ':' + s).join('|');
}

function answer(status, code, message) { return Object.freeze({status, code, message}); }
const noSend = answer(400, 'INVALID_INPUT', 'Check the form fields and try again.');
const uncertain = answer(409, 'POSSIBLY_SENT', 'We cannot confirm whether this inquiry was sent. Please contact us directly if urgent.');
const unavailable = answer(503, 'UNAVAILABLE', 'The form is unavailable. Please contact us directly.');
const forbidden = answer(403, 'CHALLENGE_REJECTED', 'Verification failed. Please retry with a fresh challenge.');

function configReady(config) {
  return config?.mockOnly === true && config.enabled === true &&
    typeof config.stage === 'string' && config.stage.startsWith('mock-') &&
    config.expectedHostname === 'localhost' && config.expectedAction === 'marketing_inquiry' &&
    /^MOCK_[A-Z_]+/.test(config.rateSecret ?? '') &&
    /^MOCK_[A-Z_]+/.test(config.tokenSecret ?? '') &&
    /^MOCK_[A-Z_]+/.test(config.deliverySecret ?? '') &&
    Number.isInteger(config.keyVersion) && config.keyVersion > 0 &&
    config.from === 'mock-sender@example.invalid' && config.to === 'mock-inbox@example.invalid';
}

/**
 * No real provider logic; caller supplies synthetic wire and trusted ingress
 * separately. Only a future independently reviewed server adapter can provide
 * a trusted ingress identity or real secrets.
 */
export function createMockHandler({ store, verifier, sender, config, clock = () => Date.now(), logger = () => {} }) {
  return async function handle(wire, trustedIngress) {
    if (!configReady(config)) return unavailable;
    if (wire?.method !== 'POST') return answer(405,'METHOD','POST required.');
    if (wire?.contentType !== 'application/json' && wire?.contentType !== 'application/json; charset=utf-8') return answer(415,'CONTENT_TYPE','JSON required.');
    if (wire.origin !== undefined && wire.origin !== 'http://localhost') return answer(403,'ORIGIN','Origin not permitted.');
    if (typeof trustedIngress?.source !== 'string' || !/^[a-z0-9:.]{3,64}$/i.test(trustedIngress.source) || trustedIngress.verified !== true) return unavailable;
    let normalized;
    try { normalized = normalizeInput(parseStrictFlatJson(await boundedBody(wire.body, wire.contentLength))); }
    catch { return noSend; }
    const now = clock();
    const rateKey = digest(config.rateSecret, config.stage + ':source:v' + config.keyVersion, trustedIngress.source);
    const tokenKey = digest(config.tokenSecret, config.stage + ':token:v' + config.keyVersion, normalized.token);
    let lease = null;
    try {
      const admission = await store.admit({ stage:config.stage, keyVersion:config.keyVersion, rateKey, tokenKey, now });
      if (!admission.ok) return admission.reason === 'limit' ? answer(429,'THROTTLED','Please try again later.') :
        admission.reason === 'replay' ? forbidden : unavailable;
      lease = admission.lease;
      let verified = false;
      try {
        const outcome = await verifier.verify(normalized.token);
        const age = now - outcome?.challengeTs;
        if (!outcome || outcome.success !== true || outcome.hostname !== config.expectedHostname ||
            outcome.action !== config.expectedAction || !Number.isFinite(age) || age < -5000 || age > 300000) {
          await store.finish(lease, 'FAILED');
          lease = null;
          return forbidden;
        }
        verified = true;
        await store.finish(lease, 'VERIFIED');
        lease = null;
      } catch {
        // Uncertain provider outcome: retain replay tombstone, never retry Siteverify.
        try { await store.finish(lease, 'CLOSED'); lease = null; } catch {}
        return unavailable;
      }
      if (!verified) return forbidden;
      const logicalKey = digest(config.deliverySecret,config.stage + ':canonical:v1:' + config.keyVersion,canonicalFields(normalized));
      let claim;
      try { claim = await store.claimDelivery({logicalKey,now}); } catch { return unavailable; }
      if (!claim.ok) return uncertain;
      try {
        await store.deliveryState(logicalKey, 'SENDING');
        // Only structured fixed routing and a plain-text mock; never visitor-controlled To/From.
        const accepted = await sender.send({
          to:config.to, from:config.from,
          replyTo:normalized.email,
          text:[normalized.name, normalized.email, normalized.business, normalized.service, normalized.message].join('\n')
        });
        if (accepted?.accepted !== true) {
          await store.deliveryState(logicalKey, 'FAILED');
          return unavailable;
        }
        await store.deliveryState(logicalKey, 'ACCEPTED');
        logger({category:'accepted',correlation:'mock'}); // No raw fields, IP, token or message.
        return answer(202,'RELAY_ACCEPTED','The mail service accepted your request; inbox delivery is not guaranteed.');
      } catch {
        // Includes accepted-but-response-lost, worker failure and ambiguous send.
        try { await store.deliveryState(logicalKey, 'UNKNOWN'); } catch {}
        return answer(502,'DELIVERY_UNKNOWN','We could not confirm delivery. Your inquiry might have been sent; please contact us directly if urgent.');
      }
    } catch { return unavailable; }
    finally { if (lease !== null) { try { await store.finish(lease,'CLOSED'); } catch {} } }
  };
}

/**
 * A deterministic synchronous single-process stand-in for a serializable
 * Durable Object transaction. NOT persistent, distributed or deployable.
 * All test "instances" share this one store; service deliberately injects it.
 */
export class FakeAtomicStore {
  constructor({ clock = () => Date.now(), sourceLimit=5, globalLimit=120,
    sourceConcurrency=2, globalConcurrency=8, maxSourceKeys=256 } = {}) {
    this.clock=clock;
    this.limits={sourceLimit,globalLimit,sourceConcurrency,globalConcurrency,maxSourceKeys};
    this.rate=new Map();this.tokens=new Map();this.logical=new Map();
    this.inflight=new Map();this.globalInflight=0;this.epoch=null;
    this.offline=false;this.failAtomic=false;this.activeKeyVersion=1;this.maxGlobalObserved=0;
  }
  admit({stage,keyVersion,rateKey,tokenKey,now}) {
    if(this.offline || this.failAtomic || keyVersion!==this.activeKeyVersion) throw new Error('store-unavailable');
    const epoch=Math.floor(now/900000);
    // Compute prospective transaction state without mutating. Commit all at once.
    const previous=this.epoch===epoch?this.rate:new Map();
    const aggregate=previous.get('__global__')??0;
    const fromSource=previous.get(rateKey)??0;
    const distinct=[...previous.keys()].filter(k=>k!=='__global__').length;
    if(this.tokens.get(tokenKey)?.expiresAt>now) return {ok:false,reason:'replay'};
    const limits=this.limits;
    if(aggregate>=limits.globalLimit||fromSource>=limits.sourceLimit||
       this.globalInflight>=limits.globalConcurrency||
       (this.inflight.get(rateKey)??0)>=limits.sourceConcurrency||
       (fromSource===0&&distinct>=limits.maxSourceKeys)) return {ok:false,reason:'limit'};
    const next=new Map(previous);next.set('__global__',aggregate+1);next.set(rateKey,fromSource+1);
    // Atomic commit point in fake; no await or partial writes.
    this.rate=next;this.epoch=epoch;
    this.globalInflight++;this.inflight.set(rateKey,(this.inflight.get(rateKey)??0)+1);
    this.tokens.set(tokenKey,{expiresAt:now+TOKEN_TOMBSTONE_MS,status:'PENDING'});
    this.maxGlobalObserved=Math.max(this.maxGlobalObserved,aggregate+1);
    return {ok:true,lease:{rateKey,tokenKey,closed:false}};
  }
  finish(lease,status) {
    if(this.offline) throw new Error('store-unavailable');
    if(lease.closed) throw new Error('double-release');
    lease.closed=true;
    const previous=this.tokens.get(lease.tokenKey);
    if(previous) previous.status=status;
    this.globalInflight--;
    const left=(this.inflight.get(lease.rateKey)??1)-1;
    if(left) this.inflight.set(lease.rateKey,left); else this.inflight.delete(lease.rateKey);
  }
  claimDelivery({logicalKey,now}) {
    if(this.offline) throw new Error('store-unavailable');
    if((this.logical.get(logicalKey)?.expiresAt??0)>now) return {ok:false};
    this.logical.set(logicalKey,{status:'RESERVED',expiresAt:now+LOGICAL_DEDUPE_MS});
    return {ok:true};
  }
  deliveryState(logicalKey,status) {
    if(this.offline) throw new Error('store-unavailable');
    const previous=this.logical.get(logicalKey);
    if(!previous) throw new Error('missing-claim');
    previous.status=status;
  }
  snapshot() { return { attempts:this.rate.get('__global__')??0, tokens:this.tokens.size,
      logical:[...this.logical.values()].map(x=>x.status), inFlight:this.globalInflight }; }
}

export function syntheticPayload(patch={}) {
  return {name:'Fictional Demo',email:'example@example.invalid',business:'Test',
    service:'website',message:'This is a fabricated inquiry used only for contract tests.',
    processing_ack:'yes',challenge_token:'TEST-CAPTCHA-TOKEN',
    request_id:'123e4567-e89b-42d3-a456-426614174000',...patch};
}
export function syntheticWire(payload=syntheticPayload(),patch={}) {
  return {method:'POST',contentType:'application/json',origin:'http://localhost',
    body:encoder.encode(JSON.stringify(payload)),...patch};
}
export const syntheticIngress = Object.freeze({source:'192.0.2.22',verified:true});
export function syntheticConfig(patch={}) {
  return {mockOnly:true,enabled:true,stage:'mock-site23',expectedHostname:'localhost',
    expectedAction:'marketing_inquiry',rateSecret:'MOCK_RATE_SECRET',tokenSecret:'MOCK_TOKEN_SECRET',
    deliverySecret:'MOCK_DELIVERY_SECRET',keyVersion:1,from:'mock-sender@example.invalid',
    to:'mock-inbox@example.invalid',...patch};
}
