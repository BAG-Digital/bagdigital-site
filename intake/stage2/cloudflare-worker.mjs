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
import {createWorkerEntrypoint} from './worker-entrypoint.mjs';

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

/**
 * There is intentionally NO trusted-ingress resolver in this concrete Worker.
 * Cloudflare request.cf, CF-Connecting-IP, X-Real-IP and other caller-influenced
 * metadata cannot attest source identity. Consequently the Worker remains
 * fail-closed even if someone mistakenly configures INTAKE_ENABLED=true.
 *
 * Keel must first verify Cloudflare zone binding, ingress source attribution,
 * same-zone Worker-to-Worker bypass paths, edge/WAF and host access. Only a
 * subsequent independently reviewed, founder-authorized source change may
 * supply a trusted ingress resolver and enable any reachable staging.
 */
export default createWorkerEntrypoint({
  createHandler:createStage2Handler,
  createVerifier:createTurnstileVerifier,
  createSender:createFixedRelay,
  fetchImpl:(...args)=>fetch(...args)
});
