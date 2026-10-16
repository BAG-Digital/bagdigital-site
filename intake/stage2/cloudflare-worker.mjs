/**
 * CLOUD HOST REVIEW CANDIDATE - NOT DEPLOYED OR CONFIGURED.
 * No Wrangler route/namespace, DNS, secret, provider account, or release flag is
 * created by this source. Cloudflare-specific trust and persistence require
 * independent Vesper/Keel verification before any publicly reachable endpoint.
 */
import {DurableObject} from 'cloudflare:workers';
import {SqliteStageCoordinator} from './sql-coordinator.mjs';
import {createStage2Handler} from './guarded-handler.mjs';
import {createTurnstileVerifier,createFixedRelay} from './provider-adapters.mjs';

export class IntakeCoordinator extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.store=new SqliteStageCoordinator(ctx.storage,{
      stage:env.STAGE,keyVersion:Number(env.KEY_VERSION),
      sourceLimit:5,globalLimit:120,sourceConcurrency:2,
      globalConcurrency:8,maxSourceKeys:256
    });
  }
  async admit(args){return this.store.admit(args)}
  async finish(lease,status){return this.store.finish(lease,status)}
  async claimDelivery(args){return this.store.claimDelivery(args)}
  async deliveryState(claim,expected,status){return this.store.deliveryState(claim,expected,status)}
}

const noStore=new Response('Inquiry service disabled.',{
  status:503,headers:{'Content-Type':'text/plain; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});

export default {
  async fetch(request,env){
    // Default-off and synthetic-preview-only until a NEW independently
    // reviewed source/config and founder release decision exist.
    if(env?.INTAKE_ENABLED!=='true'||env?.STAGE!=='stage-preview')return noStore;
    if(!env?.INTAKE_COORDINATOR || !env?.TURNSTILE_SECRET ||
       !env?.SEND_API_KEY || !env?.TOKEN_HMAC_SECRET ||
       !env?.RATE_HMAC_SECRET || !env?.DELIVERY_HMAC_SECRET)return noStore;
    const origin=env.ALLOWED_ORIGIN;
    // This is a browser convenience, never a trust/authentication boundary.
    if(request.method==='OPTIONS'&&new URL(request.url).pathname==='/inquiry'&&
       request.headers.get('origin')===origin&&
       request.headers.get('access-control-request-method')==='POST'){
      return new Response(null,{status:204,headers:{
        'Access-Control-Allow-Origin':origin,
        'Access-Control-Allow-Methods':'POST, OPTIONS',
        'Access-Control-Allow-Headers':'content-type',
        'Access-Control-Max-Age':'300','Vary':'Origin',
        'Cache-Control':'no-store'}});
    }
    try{
      // Only one Durable Object per stage. Never shard global quotas.
      const stageStore=env.INTAKE_COORDINATOR.getByName('one-state-'+env.STAGE);
      const verifier=createTurnstileVerifier({
        fetchImpl:fetch,secret:env.TURNSTILE_SECRET,timeoutMs:3000
      });
      const sender=createFixedRelay({
        fetchImpl:fetch,apiKey:env.SEND_API_KEY,
        from:env.VERIFIED_SENDER,to:env.FIXED_INBOX,timeoutMs:3000
      });
      const config={
        enabled:true,stage:env.STAGE,keyVersion:Number(env.KEY_VERSION),
        expectedHostname:env.EXPECTED_HOSTNAME,expectedAction:'marketing_inquiry',
        allowedOrigin:origin,from:env.VERIFIED_SENDER,to:env.FIXED_INBOX,
        rateSecret:env.RATE_HMAC_SECRET,tokenSecret:env.TOKEN_HMAC_SECRET,
        deliverySecret:env.DELIVERY_HMAC_SECRET
      };
      // The presence of request.cf is NOT proof of an authenticated ingress
      // topology. Keel must verify direct-zone routing, proxy header overwrite
      // semantics and all other request paths BEFORE enabling a preview.
      const verifiedIngress=Boolean(request.cf)&&
        typeof request.headers.get('cf-connecting-ip')==='string';
      const handle=createStage2Handler({
        store:stageStore,verifier,sender,config
      });
      return await handle(request,{verified:verifiedIngress,
        source:verifiedIngress?request.headers.get('cf-connecting-ip'):undefined});
    }catch{return noStore}
  }
};
