/**
 * Site #26 / Stage 2 CANDIDATE network adapters.
 * These functions have no automatic network access: a caller must explicitly
 * inject fetchImpl and reviewed credentials. They never retry requests.
 * No deployed route, production secrets, or vendor enrollment exist here.
 */

export class AdapterFailure extends Error {
  constructor(kind) { super(kind); this.name = 'AdapterFailure'; this.kind = kind; }
}

function safeNonempty(value, max=2048) {
  return typeof value === 'string' && value.length > 0 && value.length <= max &&
    !/[\r\n\u0000-\u001f\u007f]/.test(value);
}
function safeEmail(value) {
  return safeNonempty(value, 254) &&
    /^[^\s@<>(),;:\[\]\\"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

async function readBoundedJson(response, maxBytes) {
  const header = response.headers?.get?.('content-length');
  if (header !== null && header !== undefined &&
      (!/^\d+$/.test(header) || Number(header) > maxBytes)) throw new AdapterFailure('response-size');
  if (!response.body?.getReader) throw new AdapterFailure('response-stream');
  const reader = response.body.getReader();
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const piece = await reader.read();
      if (piece.done) break;
      if (!(piece.value instanceof Uint8Array)) throw new AdapterFailure('response-stream');
      length += piece.value.byteLength;
      if (length > maxBytes) throw new AdapterFailure('response-size');
      chunks.push(piece.value);
    }
  } finally {
    if (length > maxBytes) { try { await reader.cancel(); } catch {} }
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
  catch { throw new AdapterFailure('response-json'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AdapterFailure('response-shape');
  return parsed;
}

async function oneBoundedFetch(fetchImpl, url, init, timeoutMs, maxResponseBytes) {
  if (typeof fetchImpl !== 'function') throw new AdapterFailure('fetch-not-configured');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10000) throw new AdapterFailure('invalid-deadline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),timeoutMs);
  try {
    // Deadline covers request AND response-stream reading. No retries.
    const response = await fetchImpl(url,{...init,signal:controller.signal,redirect:'error'});
    const body = await readBoundedJson(response,maxResponseBytes);
    return {status:response.status,body};
  } catch (error) {
    if (controller.signal.aborted) throw new AdapterFailure('timeout');
    if (error instanceof AdapterFailure) throw error;
    throw new AdapterFailure('network-or-response');
  } finally { clearTimeout(timer); }
}

export function createTurnstileVerifier({fetchImpl,secret,timeoutMs=3000}) {
  if (!safeNonempty(secret,512)) throw new AdapterFailure('unconfigured-secret');
  return {
    async verify(token) {
      if (!safeNonempty(token,2048)) throw new AdapterFailure('token');
      const data=new FormData();
      data.set('secret',secret); data.set('response',token);
      const result=await oneBoundedFetch(fetchImpl,
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {method:'POST',body:data},timeoutMs,8192);
      if (result.status !== 200) throw new AdapterFailure('verification-http');
      const b=result.body;
      if (typeof b.success!=='boolean' || typeof b.hostname!=='string' ||
          typeof b.action!=='string' || typeof b.challenge_ts!=='string' ||
          b.hostname.length>253 || b.action.length>100) throw new AdapterFailure('verification-shape');
      const timestamp=Date.parse(b.challenge_ts);
      if (!Number.isFinite(timestamp) || !/^\d{4}-\d\d-\d\dT/.test(b.challenge_ts)) throw new AdapterFailure('verification-timestamp');
      return {success:b.success,hostname:b.hostname,action:b.action,challengeTs:timestamp};
    }
  };
}

export function createFixedRelay({fetchImpl,apiKey,from,to,timeoutMs=3000}) {
  if (!safeNonempty(apiKey,1024) || !safeEmail(from) || !safeEmail(to)) throw new AdapterFailure('relay-config');
  return {
    async send({to:requestedTo,from:requestedFrom,replyTo,text,idempotencyKey}) {
      if (requestedTo!==to || requestedFrom!==from || !safeEmail(replyTo) ||
          typeof text!=='string' || text.length<1 || text.length>12000 ||
          !/^[0-9a-f]{64}$/.test(idempotencyKey)) throw new AdapterFailure('relay-envelope');
      // Structured fields only: an untrusted visitor cannot set To/From/Cc/Bcc.
      const result=await oneBoundedFetch(fetchImpl,'https://api.resend.com/emails',
        {method:'POST',
         headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json',
           'Idempotency-Key':idempotencyKey},
         body:JSON.stringify({from,to:[to],reply_to:replyTo,subject:'BAGDigital website inquiry',text})},
        timeoutMs,4096);
      if ((result.status===200 || result.status===201) &&
          safeNonempty(result.body.id,200) && /^[\w-]+$/.test(result.body.id)) {
        return {accepted:true};
      }
      if (result.status>=400 && result.status<500) return {accepted:false,definite:true};
      // An upstream 5xx can occur after acceptance. No automatic resend.
      throw new AdapterFailure('delivery-ambiguous');
    }
  };
}
