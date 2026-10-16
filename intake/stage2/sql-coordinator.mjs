/**
 * Site #26: SQLite-backed Durable Object coordination CANDIDATE.
 *
 * One instance PER stage must own ALL source/global quotas, replay digests,
 * verifier leases and logical delivery states. No network or email here.
 * Not yet exercised against actual Cloudflare Durable Object storage, restarts
 * or several deployed Workers. Security/release review is mandatory.
 */
const TOKEN_MS=15*60*1000;
const DELIVERY_MS=24*60*60*1000;
const WINDOW_MS=15*60*1000;
const LEASE_MS=5000;
const DIGEST=/^[0-9a-f]{64}$/;

export class SqliteStageCoordinator {
  constructor(storage,{stage,keyVersion,sourceLimit=5,globalLimit=120,sourceConcurrency=2,
    globalConcurrency=8,maxSourceKeys=256}){
    if(!storage?.transactionSync || !storage?.sql?.exec ||
       typeof stage!=='string'||!/^stage-[a-z0-9-]{1,40}$/.test(stage) ||
       !Number.isInteger(keyVersion)||keyVersion<1) throw Error('invalid-coordinator');
    this.storage=storage;this.stage=stage;this.keyVersion=keyVersion;
    this.limits={sourceLimit,globalLimit,sourceConcurrency,globalConcurrency,maxSourceKeys};
    if(Object.values(this.limits).some(n=>!Number.isInteger(n)||n<1||n>100000)) throw Error('invalid-limits');
    // All tables live in the SAME SQLite-backed Durable Object. No split KV
    // counters or eventually consistent global store.
    const sql=storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS meta (name TEXT PRIMARY KEY,value INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS quota (qkey TEXT PRIMARY KEY,epoch INTEGER NOT NULL,used INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS tokens (token_key TEXT PRIMARY KEY,source_key TEXT NOT NULL,claim_id TEXT NOT NULL,status TEXT NOT NULL,lease_at INTEGER NOT NULL,expires_at INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS delivery (logical_key TEXT PRIMARY KEY,claim_id TEXT NOT NULL,status TEXT NOT NULL,expires_at INTEGER NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS token_lease_idx ON tokens(status,lease_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS token_expiry_idx ON tokens(expires_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS delivery_expiry_idx ON delivery(expires_at)');
    // Refuse stage/keyVersion reset by an accidental Worker configuration.
    const row=sql.exec("SELECT value FROM meta WHERE name='key_version'").toArray()[0];
    if(row && row.value!==keyVersion) throw Error('key-version-migration-required');
    if(!row) sql.exec("INSERT INTO meta(name,value) VALUES('key_version',?)",keyVersion);
  }

  sqlNow(){
    // SQLite engine time, not a caller-supplied Worker timestamp.
    // Persist a monotonic high-water mark across Durable Object restarts.
    const sql=this.storage.sql;
    const observed=Number(sql.exec("SELECT CAST(strftime('%s','now') AS INTEGER)*1000 AS t").toArray()[0]?.t);
    if(!Number.isSafeInteger(observed) || observed<=0) throw Error('clock');
    const last=Number(sql.exec("SELECT value FROM meta WHERE name='logical_time'").toArray()[0]?.value||0);
    const now=Math.max(observed,last+1);
    sql.exec("INSERT INTO meta(name,value) VALUES('logical_time',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value",now);
    return now;
  }

  sweep(now){
    const sql=this.storage.sql;
    sql.exec("UPDATE tokens SET status='CLOSED',lease_at=0 WHERE status='PENDING' AND lease_at<=?",now);
    sql.exec("DELETE FROM tokens WHERE expires_at<=?",now);
    sql.exec("DELETE FROM delivery WHERE expires_at<=?",now);
    sql.exec("DELETE FROM quota WHERE epoch<?",Math.floor(now/WINDOW_MS));
  }

  async admit({stage,keyVersion,rateKey,tokenKey}){
    if(stage!==this.stage||keyVersion!==this.keyVersion||!DIGEST.test(rateKey)||!DIGEST.test(tokenKey)) throw Error('stage-mismatch');
    const claimId=crypto.randomUUID();
    return this.storage.transactionSync(()=>{
      const sql=this.storage.sql;
      const now=this.sqlNow(),epoch=Math.floor(now/WINDOW_MS);
      this.sweep(now);
      if(sql.exec('SELECT 1 FROM tokens WHERE token_key=?',tokenKey).toArray().length) return {ok:false,reason:'replay'};
      const source='s:'+rateKey,global='global';
      const used=(key)=>Number(sql.exec('SELECT used FROM quota WHERE qkey=? AND epoch=?',key,epoch).toArray()[0]?.used||0);
      if(used(source)>=this.limits.sourceLimit||used(global)>=this.limits.globalLimit) return {ok:false,reason:'limit'};
      const fresh=used(source)===0;
      const cardinality=Number(sql.exec("SELECT COUNT(*) AS n FROM quota WHERE epoch=? AND qkey LIKE 's:%'",epoch).toArray()[0]?.n);
      if(fresh && cardinality>=this.limits.maxSourceKeys) return {ok:false,reason:'limit'};
      const globalIn=Number(sql.exec("SELECT COUNT(*) AS n FROM tokens WHERE status='PENDING' AND lease_at>?",now).toArray()[0]?.n);
      const sourceIn=Number(sql.exec("SELECT COUNT(*) AS n FROM tokens WHERE source_key=? AND status='PENDING' AND lease_at>?",rateKey,now).toArray()[0]?.n);
      if(globalIn>=this.limits.globalConcurrency||sourceIn>=this.limits.sourceConcurrency) return {ok:false,reason:'limit'};
      for(const key of [source,global]){
        sql.exec('INSERT INTO quota(qkey,epoch,used) VALUES(?,?,1) ON CONFLICT(qkey) DO UPDATE SET epoch=excluded.epoch,used=CASE WHEN quota.epoch=excluded.epoch THEN quota.used+1 ELSE 1 END',key,epoch);
      }
      sql.exec("INSERT INTO tokens(token_key,source_key,claim_id,status,lease_at,expires_at) VALUES(?,?,?,'PENDING',?,?)",tokenKey,rateKey,claimId,now+LEASE_MS,now+TOKEN_MS);
      return {ok:true,lease:Object.freeze({stage,keyVersion,tokenKey,claimId})};
    });
  }

  async finish(lease,status){
    if(!['VERIFIED','FAILED','CLOSED'].includes(status)||!lease||lease.stage!==this.stage||lease.keyVersion!==this.keyVersion||!DIGEST.test(lease.tokenKey)) throw Error('invalid-finish');
    return this.storage.transactionSync(()=>{
      const now=this.sqlNow();this.sweep(now);
      const sql=this.storage.sql;
      sql.exec("UPDATE tokens SET status=?,lease_at=0 WHERE token_key=? AND claim_id=? AND status='PENDING' AND lease_at>?",status,lease.tokenKey,lease.claimId,now);
      return Number(sql.exec('SELECT changes() AS n').toArray()[0]?.n)===1;
    });
  }

  async claimDelivery({stage,logicalKey}){
    if(stage!==this.stage||!DIGEST.test(logicalKey))throw Error('invalid-delivery-key');
    const claimId=crypto.randomUUID();
    return this.storage.transactionSync(()=>{
      const now=this.sqlNow();this.sweep(now);
      const sql=this.storage.sql;
      if(sql.exec('SELECT 1 FROM delivery WHERE logical_key=?',logicalKey).toArray().length) return {ok:false};
      sql.exec("INSERT INTO delivery(logical_key,claim_id,status,expires_at) VALUES(?,?,'RESERVED',?)",logicalKey,claimId,now+DELIVERY_MS);
      return {ok:true,claim:Object.freeze({stage,logicalKey,claimId})};
    });
  }

  async deliveryState(claim,expected,status){
    if(!claim||claim.stage!==this.stage||!DIGEST.test(claim.logicalKey)||
       !((expected==='RESERVED'&&status==='SENDING')||
         (expected==='SENDING'&&['ACCEPTED','FAILED','UNKNOWN'].includes(status)))) throw Error('invalid-transition');
    return this.storage.transactionSync(()=>{
      this.sqlNow();
      const sql=this.storage.sql;
      sql.exec('UPDATE delivery SET status=? WHERE logical_key=? AND claim_id=? AND status=?',status,claim.logicalKey,claim.claimId,expected);
      return Number(sql.exec('SELECT changes() AS n').toArray()[0]?.n)===1;
    });
  }
}
