/**
 * Local Chromium FormSubmit smoke. NEVER clicks Submit or contacts provider.
 * Provider CAPTCHA, honeypot behavior and delivery require separate testing.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const root=new URL('../',import.meta.url);
const paths={'/':'index.html','/index.html':'index.html','/privacy.html':'privacy.html',
  '/app.js':'app.js','/styles.css':'styles.css'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=createServer((req,res)=>{
  const filename=paths[req.url];
  if(req.method!=='GET'||!filename){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',filename.endsWith('.html')?'text/html; charset=utf-8':
    filename.endsWith('.js')?'application/javascript; charset=utf-8':'text/css; charset=utf-8');
  res.end(readFileSync(new URL(filename,root)));
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const localOrigin='http://127.0.0.1:'+server.address().port+'/';
const profile=mkdtempSync(join(tmpdir(),'bag-formsubmit-browser-'));
const chrome=spawn(process.env.BROWSER||'chromium',[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--disable-extensions','--no-first-run',
  '--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
],{stdio:'ignore'});
let ws,seq=0;
const pending=new Map(),network=[];
try{
  const portFile=join(profile,'DevToolsActivePort');
  for(let tries=0;tries<120&&!existsSync(portFile);tries++)await sleep(100);
  assert.ok(existsSync(portFile),'Chromium debugging port unavailable');
  const port=Number(readFileSync(portFile,'utf8').split('\n')[0]);
  const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
  const tab=targets.find(t=>t.type==='page');
  assert.ok(tab?.webSocketDebuggerUrl,'No Chromium page');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  ws.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.method==='Network.requestWillBeSent')network.push(data.params.request.url);
    const w=pending.get(data.id);
    if(w){pending.delete(data.id);data.error?w.reject(Error(JSON.stringify(data.error))):w.resolve(data.result)}
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{
      if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method))}
    },10000).unref();
  });
  const inspect=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['*formsubmit.co*','*://bagdigital.tech/*']});
  await send('Emulation.setScriptExecutionDisabled',{value:true});
  const nav=await send('Page.navigate',{url:localOrigin});
  assert.ok(!nav.errorText,'Could not navigate');
  let ready=false;
  for(let n=0;n<90;n++){
    ready=await inspect("document.readyState==='complete'&&!!document.getElementById('quoteForm')");
    if(ready)break;
    await sleep(100);
  }
  assert.ok(ready,'Native form failed to load');
  const state=await inspect("(()=>{const f=document.getElementById('quoteForm');"+
    "const fields=['name','email','details'].map(k=>f.elements.namedItem(k));"+
    "return {action:new URL(f.action).origin,method:f.method,"+
    "honey:f.elements.namedItem('_honey')?.name,honeyValue:f.elements.namedItem('_honey')?.value,"+
    "captcha:!!f.elements.namedItem('_captcha'),noValidate:f.noValidate,"+
    "emailLink:document.getElementById('emailLink')?.getAttribute('href'),"+
    "emailButton:document.getElementById('emailDirectBtn')?.getAttribute('href'),"+
    "privacy:!!f.querySelector('a[href=\"/privacy.html\"]'),"+
    "labels:fields.every(e=>e?.labels?.length>0),invalid:!f.checkValidity()};})()");
  assert.equal(state.action,'https://formsubmit.co');
  assert.equal(state.method,'post');
  assert.equal(state.honey,'_honey');
  assert.equal(state.honeyValue,'');
  assert.equal(state.captcha,false);
  assert.equal(state.noValidate,false);
  assert.equal(state.emailLink,'mailto:jaime@bagdigital.tech');
  assert.equal(state.emailButton,'mailto:jaime@bagdigital.tech');
  assert.equal(state.privacy,true);
  assert.equal(state.labels,true);
  assert.equal(state.invalid,true);
  const validity=await inspect("(()=>{const f=document.getElementById('quoteForm');"+
    "f.elements.namedItem('name').value='Synthetic Example';"+
    "f.elements.namedItem('details').value='Offline local browser test only.';"+
    "f.elements.namedItem('email').value='not-an-email';"+
    "const rejectsBadEmail=!f.checkValidity();"+
    "f.elements.namedItem('email').value='qa@example.invalid';"+
    "return {rejectsBadEmail,complete:f.checkValidity()};})()");
  assert.deepEqual(validity,{rejectsBadEmail:true,complete:true});
  for(const width of [320,375,768,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await sleep(100);
    const flow=await inspect("({view:document.documentElement.clientWidth,"+
      "full:document.documentElement.scrollWidth,"+
      "visible:document.getElementById('quoteForm').getClientRects().length>0})");
    assert.ok(flow.visible,'Form hidden at '+width);
    assert.ok(flow.full<=flow.view+2,'Horizontal overflow at '+width+':'+JSON.stringify(flow));
  }
  await send('Emulation.clearDeviceMetricsOverride');
  const pn=await send('Page.navigate',{url:localOrigin+'privacy.html'});
  assert.ok(!pn.errorText,'Privacy nav failure');
  let privacyReady=false;
  for(let n=0;n<90;n++){
    privacyReady=await inspect("document.readyState==='complete'&&!!document.querySelector('h1')");
    if(privacyReady)break;
    await sleep(100);
  }
  assert.ok(privacyReady,'Privacy page missing');
  const privacyText=await inspect("document.body.innerText");
  assert.match(privacyText,/FormSubmit/);
  assert.match(privacyText,/CAPTCHA/);
  await send('Emulation.setScriptExecutionDisabled',{value:false});
  await send('Page.navigate',{url:localOrigin});
  let enhanced=false;
  for(let n=0;n<90;n++){
    enhanced=await inspect("document.readyState==='complete'&&"+
      "document.getElementById('emailDirectBtn')?.getAttribute('href')?.startsWith('mailto:')");
    if(enhanced)break;
    await sleep(100);
  }
  assert.ok(enhanced,'Email fallback lost after JavaScript');
  assert.ok(network.every(url=>url.startsWith(localOrigin)||url==='about:blank'),
    'Unexpected external request: '+JSON.stringify(network));
  console.log('PASS local Chromium: native HTML POST, _honey, CAPTCHA default, mailto without JS, native validation, responsive and privacy.');
  console.log('No form submission attempted. Provider CAPTCHA, honeypot suppression and inbox delivery UNTESTED.');
}finally{
  ws?.close();
  const exited=once(chrome,'exit').catch(()=>{});
  chrome.kill('SIGTERM');
  await Promise.race([exited,sleep(3000)]);
  server.close();
  await sleep(100);
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:100});
}
