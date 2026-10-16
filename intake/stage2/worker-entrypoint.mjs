/**
 * Stage 2 Node-testable Cloudflare Worker entrypoint boundary.
 *
 * NO production ingress attestation exists yet. The real Cloudflare Worker
 * intentionally does NOT pass resolveTrustedIngress and therefore refuses
 * POSTs even if someone accidentally flips INTAKE_ENABLED.
 *
 * Keel and Vesper must separately review and attest an actual public ingress
 * adapter and zone routing before any preview traffic is authorized.
 * request.cf + CF-Connecting-IP, Origin, X-Real-IP and X-Forwarded-For
 * are NEVER sufficient to set {verified:true}.
 */
export function disabledResponse(request,env) {
  let origin;
  try {
    if (typeof env?.ALLOWED_ORIGIN === 'string' &&
        env.ALLOWED_ORIGIN.startsWith('https://') &&
        request?.headers?.get('origin') === env.ALLOWED_ORIGIN) {
      origin=env.ALLOWED_ORIGIN;
    }
  } catch {}
  return new Response('Inquiry service disabled.',{
    status:503,
    headers:{
      'Content-Type':'text/plain; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
      ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
    }
  });
}

export function createWorkerEntrypoint({
  createHandler,createVerifier,createSender,fetchImpl,
  // This must be a SERVER-CODE injected attester, NOT env/visitor metadata.
  resolveTrustedIngress
}) {
  return {
    async fetch(request,env) {
      try {
        // Default-off. Stage 2 is a SOURCE candidate, not a configured host.
        if (env?.INTAKE_ENABLED !== 'true' || env?.STAGE !== 'stage-preview' ||
            !env?.INTAKE_COORDINATOR || !env?.TURNSTILE_SECRET ||
            !env?.SEND_API_KEY || !env?.TOKEN_HMAC_SECRET ||
            !env?.RATE_HMAC_SECRET || !env?.DELIVERY_HMAC_SECRET ||
            typeof createHandler !== 'function' ||
            typeof createVerifier !== 'function' ||
            typeof createSender !== 'function' ||
            typeof fetchImpl !== 'function' ||
            typeof resolveTrustedIngress !== 'function') return disabledResponse(request,env);

        // No caller-provided header/CF metadata promotes itself into trusted
        // provenance. Only an independently reviewed server-code resolver may.
        const attestation=await resolveTrustedIngress(request,env);
        if (attestation?.verified !== true ||
            attestation?.trustBasis !== 'independently-reviewed-edge' ||
            typeof attestation?.source !== 'string' ||
            !/^[a-z0-9:.]{3,64}$/i.test(attestation.source)) {
          return disabledResponse(request,env);
        }

        const origin=env.ALLOWED_ORIGIN;
        if (request.method === 'OPTIONS' &&
            new URL(request.url).pathname === '/inquiry' &&
            request.headers.get('origin') === origin &&
            request.headers.get('access-control-request-method') === 'POST') {
          return new Response(null,{status:204,headers:{
            'Access-Control-Allow-Origin':origin,
            'Access-Control-Allow-Methods':'POST, OPTIONS',
            'Access-Control-Allow-Headers':'content-type',
            'Access-Control-Max-Age':'300',
            'Vary':'Origin','Cache-Control':'no-store',
            'X-Content-Type-Options':'nosniff'
          }});
        }

        // EXACTLY ONE coordination Durable Object per stage.
        const stageStore=env.INTAKE_COORDINATOR.getByName('one-state-'+env.STAGE);
        const verifier=createVerifier({
          fetchImpl,secret:env.TURNSTILE_SECRET,timeoutMs:3000
        });
        const sender=createSender({
          fetchImpl,apiKey:env.SEND_API_KEY,
          from:env.VERIFIED_SENDER,to:env.FIXED_INBOX,timeoutMs:3000
        });
        const config={
          enabled:true,stage:env.STAGE,keyVersion:Number(env.KEY_VERSION),
          expectedHostname:env.EXPECTED_HOSTNAME,expectedAction:'marketing_inquiry',
          allowedOrigin:origin,from:env.VERIFIED_SENDER,to:env.FIXED_INBOX,
          rateSecret:env.RATE_HMAC_SECRET,tokenSecret:env.TOKEN_HMAC_SECRET,
          deliverySecret:env.DELIVERY_HMAC_SECRET
        };
        const handle=createHandler({store:stageStore,verifier,sender,config});
        return await handle(request,{
          verified:true,source:attestation.source
        });
      } catch {
        // Worker/DO initialization, stub, provider-constructor and handler
        // failures must NEVER propagate secrets or an undefined fallback.
        return disabledResponse(request,env);
      }
    }
  };
}
