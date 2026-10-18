import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SqliteStageCoordinator} from '../intake/stage2/sql-coordinator.mjs';

// Node's builtin SQLite exercises REAL SQL DDL, unique constraints and
// synchronous transactional rollback. It is NOT Cloudflare workerd, a
// real Durable Object or a distributed/restart-on-disk durability test.
function sqliteFixture(opts={}){
  const db=new DatabaseSync(':memory:');
  const sql={exec(statement,...args){
    const query=db.prepare(statement);
    if(/^\s*SELECT/i.test(statement))return {toArray:()=>query.all(...args)};
    query.run(...args);
    return {toArray:()=>[]};
  }};
  const storage={sql,transactionSync(fn){
    db.exec('BEGIN IMMEDIATE');
    try{const value=fn();db.exec('COMMIT');return value}
    catch(e){db.exec('ROLLBACK');throw e}
  }};
  const coordinator=new SqliteStageCoordinator(storage,{stage:'stage-synthetic',keyVersion:1,...opts});
  return {db,storage,coordinator};
}
const key=c=>c.repeat(64);
const admit=(s,t='a',r='b')=>s.admit({stage:'stage-synthetic',keyVersion:1,rateKey:key(r),tokenKey:key(t)});

test('SQLite coordinator admits one atomic replay claim and never re-admits duplicate',async()=>{
  const {coordinator:s}=sqliteFixture();
  const first=await admit(s);
  assert.equal(first.ok,true);
  assert.deepEqual(await admit(s),{ok:false,reason:'replay'});
  assert.equal(await s.finish(first.lease,'VERIFIED'),true);
  assert.equal(await s.finish(first.lease,'VERIFIED'),false);
  assert.deepEqual(await admit(s),{ok:false,reason:'replay'});
});

test('stale and forged claim owner cannot close the pending verifier lease',async()=>{
  const {coordinator:s}=sqliteFixture();
  const first=(await admit(s)).lease;
  assert.equal(await s.finish({...first,claimId:'forged'},'VERIFIED'),false);
  assert.deepEqual(await admit(s),{ok:false,reason:'replay'});
  assert.equal(await s.finish(first,'VERIFIED'),true);
});

test('source and global quotas count admitted tokens atomically',async()=>{
  const {coordinator:s}=sqliteFixture({sourceLimit:2,globalLimit:3});
  assert.equal((await admit(s,'a','b')).ok,true);
  assert.equal((await admit(s,'c','b')).ok,true);
  assert.deepEqual(await admit(s,'d','b'),{ok:false,reason:'limit'});
  assert.equal((await admit(s,'e','f')).ok,true);
  assert.deepEqual(await admit(s,'f','1'),{ok:false,reason:'limit'});
});

test('atomic transaction rolls back a mid-write exception',()=>{
  const {storage}=sqliteFixture();
  assert.throws(()=>storage.transactionSync(()=>{
    storage.sql.exec("INSERT INTO quota(qkey,epoch,used) VALUES('rollback',1,1)");
    throw Error('simulated provider worker crash before commit');
  }));
  assert.equal(storage.sql.exec("SELECT COUNT(*) AS n FROM quota WHERE qkey='rollback'").toArray()[0].n,0);
});

test('different coordinator instances on same SQLite object see one replay lock',async()=>{
  const {storage,coordinator:s}=sqliteFixture();
  const second=new SqliteStageCoordinator(storage,{stage:'stage-synthetic',keyVersion:1});
  const values=await Promise.all([admit(s,'a','b'),admit(second,'a','b')]);
  assert.equal(values.filter(x=>x.ok).length,1);
  assert.equal(values.filter(x=>x.reason==='replay').length,1);
});

test('one canonical delivery claim; owner-scoped terminal transitions stay terminal',async()=>{
  const {coordinator:s}=sqliteFixture();
  const first=await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('a')});
  assert.equal(first.ok,true);
  assert.deepEqual(await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('a')}),{ok:false});
  assert.equal(await s.deliveryState({...first.claim,claimId:'wrong'},'RESERVED','SENDING'),false);
  assert.equal(await s.deliveryState(first.claim,'RESERVED','SENDING'),true);
  assert.equal(await s.deliveryState(first.claim,'SENDING','UNKNOWN'),true);
  assert.equal(await s.deliveryState(first.claim,'RESERVED','SENDING'),false);
  assert.equal(await s.deliveryState(first.claim,'SENDING','ACCEPTED'),false);
  assert.deepEqual(await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('a')}),{ok:false});
});

test('expired lease closes a token without reopening until tombstone expires',async()=>{
  const {coordinator:s}=sqliteFixture();
  let time=100000;
  s.sqlNow=()=>time;
  const first=(await admit(s)).lease;
  time+=6000;
  assert.equal(await s.finish(first,'VERIFIED'),false);
  assert.deepEqual(await admit(s),{ok:false,reason:'replay'});
  time+=15*60*1000;
  assert.equal((await admit(s)).ok,true);
});

test('logical dedupe expires only after its own 24 hour TTL',async()=>{
  const {coordinator:s}=sqliteFixture();
  let time=100000;
  s.sqlNow=()=>time;
  const first=await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('d')});
  assert.equal(first.ok,true);
  assert.equal(await s.deliveryState(first.claim,'RESERVED','SENDING'),true);
  assert.equal(await s.deliveryState(first.claim,'SENDING','ACCEPTED'),true);
  time+=23*60*60*1000;
  assert.deepEqual(await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('d')}),{ok:false});
  time+=2*60*60*1000;
  assert.equal((await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('d')})).ok,true);
});

test('store restart over the same SQLite file does not delete replay/delivery claims',async()=>{
  const {storage,coordinator:s}=sqliteFixture();
  await admit(s,'a','b');
  const claim=await s.claimDelivery({stage:'stage-synthetic',logicalKey:key('c')});
  await s.deliveryState(claim.claim,'RESERVED','SENDING');
  // New JS coordinator; same live SQLite store. This is NOT an actual Cloudflare
  // process eviction or durable disk crash restoration test.
  const restarted=new SqliteStageCoordinator(storage,{stage:'stage-synthetic',keyVersion:1});
  assert.deepEqual(await admit(restarted,'a','b'),{ok:false,reason:'replay'});
  assert.deepEqual(await restarted.claimDelivery({stage:'stage-synthetic',logicalKey:key('c')}),{ok:false});
});

test('invalid stage, digest or key rotation fails closed',async()=>{
  const {storage,coordinator:s}=sqliteFixture();
  await assert.rejects(s.admit({stage:'stage-wrong',keyVersion:1,rateKey:key('a'),tokenKey:key('b')}));
  await assert.rejects(s.claimDelivery({stage:'stage-synthetic',logicalKey:'unsafe'}));
  assert.throws(()=>new SqliteStageCoordinator(storage,{stage:'stage-synthetic',keyVersion:2}),/migration/);
});
