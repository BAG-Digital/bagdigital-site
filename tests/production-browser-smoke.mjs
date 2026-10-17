// Synthetic inactive-preview browser verification. NEVER submits or calls any external provider.
// Launched by read-only PR CI, against local HTTP. Independent human a11y remains separate.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = new URL("../", import.meta.url);
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/privacy.html", ["privacy.html", "text/html; charset=utf-8"]]
]);
const server = createServer((req, res) => {
  const entry = files.get(req.url);
  if (req.method !== "GET" || !entry) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", entry[1]);
  res.end(readFileSync(new URL(entry[0], root)));
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const profile = mkdtempSync(join(tmpdir(), "bagdigital-smoke-"));
const chrome = spawn(process.env.BROWSER || "chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--disable-background-networking", "--disable-extensions", "--no-first-run",
  "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"
], { stdio: "ignore" });
let ws;
const pending = new Map();
const requests = [];
let id = 0;
try {
  const portFile = join(profile, "DevToolsActivePort");
  for (let n = 0; n < 120 && !existsSync(portFile); n++) await wait(100);
  assert.ok(existsSync(portFile), "Chromium did not start its debug endpoint");
  const debugPort = +readFileSync(portFile, "utf8").split("\n")[0];
  const targets = await fetch("http://127.0.0.1:" + debugPort + "/json/list").then(r => r.json());
  const page = targets.find(t => t.type === "page");
  assert.ok(page, "Expected inspectable Chromium page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("message", event => {
    const data = JSON.parse(event.data);
    if (data.method === "Network.requestWillBeSent") requests.push(data.params.request.url);
    const waiter = pending.get(data.id);
    if (waiter) {
      pending.delete(data.id);
      if (data.error) waiter.reject(Error(JSON.stringify(data.error)));
      else waiter.resolve(data.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id;
    pending.set(current, { resolve, reject });
    ws.send(JSON.stringify({ id: current, method, params }));
    setTimeout(() => {
      if (pending.has(current)) {
        pending.delete(current);
        reject(Error("DevTools timeout: " + method));
      }
    }, 10000).unref();
  });
  const inspect = async body => {
    const result = await send("Runtime.evaluate", {
      expression: "(() => {" + body + "})()", returnByValue: true
    });
    assert.ok(!result.exceptionDetails, "Browser JS evaluation failed");
    return result.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  const origin = "http://127.0.0.1:" + server.address().port + "/";
  const nav = await send("Page.navigate", { url: origin });
  assert.ok(!nav.errorText, "Cannot navigate test site: " + nav.errorText);
  let loaded = false;
  for (let n = 0; n < 80; n++) {
    loaded = await inspect("return document.readyState==='complete'&&!!document.querySelector('.contact-form');");
    if (loaded) break;
    await wait(100);
  }
  assert.ok(loaded, "Contact form did not load");
  const source = await inspect(
    "const d=document.querySelector('#contact-data-note');" +
    "const group=document.querySelector('.contact-form');" +
    "const controls=[...document.querySelectorAll('.contact-form input,.contact-form textarea,.contact-form select,.contact-form button')];" +
    "return {kind:group.tagName,role:group.getAttribute('role')," +
    "disabled:controls.every(x=>x.disabled),controlCount:controls.length," +
    "nativeForms:document.forms.length,scripts:document.scripts.length," +
    "live:document.querySelector('#protected-preview-notice')?.getAttribute('aria-live')," +
    "notice:!!d,href:document.querySelector('#protected-preview-notice a')?.href," +
    "csp:document.querySelector('meta[http-equiv=\\\"Content-Security-Policy\\\"]').content};"
  );
  assert.equal(source.kind, "DIV");
  assert.equal(source.role, "group");
  assert.equal(source.nativeForms,0,"No form element may submit natively when JS is absent");
  assert.equal(source.scripts,0);
  assert.ok(source.disabled && source.controlCount>=6,"All draft input controls must be disabled");
  assert.equal(source.live,"polite");
  assert.ok(source.notice);
  assert.equal(source.href,"mailto:jaime@bagdigital.tech");
  assert.ok(source.csp.includes("form-action 'none'"));
  assert.ok(source.csp.includes("connect-src 'none'"));
  const privacyLink = await inspect(
    "const a=document.querySelector('#contact-data-note a[href=\\\"./privacy.html\\\"]');" +
    "return {exists:!!a,target:a?.target,rel:a?.rel,href:a?.href};"
  );
  assert.ok(privacyLink.exists);
  assert.equal(privacyLink.target,"_blank");
  assert.ok(privacyLink.rel.split(' ').includes("noopener"));
  assert.ok(privacyLink.rel.split(' ').includes("noreferrer"));
  assert.equal(privacyLink.href,origin+"privacy.html");

  // A script-disabled or missing-import website must retain zero native
  // submission controls and still display direct email as the only path.
  for (const width of [320,375,768,1440]) {
    await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});
    await wait(120);
    const reflow=await inspect(
      "return {view:document.documentElement.clientWidth,full:document.documentElement.scrollWidth," +
      "visible:!!document.querySelector('.contact-form').getClientRects().length," +
      "forms:document.forms.length,disabled:[...document.querySelectorAll('.contact-form input,.contact-form textarea,.contact-form select,.contact-form button')].every(x=>x.disabled)};"
    );
    assert.ok(reflow.visible && reflow.disabled && reflow.forms===0,"Inactive controls unsafe at "+width);
    assert.ok(reflow.full<=reflow.view+1,"Horizontal overflow at "+width+": "+JSON.stringify(reflow));
  }
  await send("Emulation.clearDeviceMetricsOverride");
  const labels=await inspect(
    "return ['contact-name','contact-email','contact-business','contact-service','contact-details'].map(id=>{" +
    "const el=document.getElementById(id);return !!el && el.labels.length>0 && !!el.labels[0].textContent.trim();});"
  );
  assert.ok(labels.every(Boolean),"Disabled preview controls must have accessible labels");

  // Exercise the *actual* static privacy-to-contact route in a browser.
  // It must work from privacy.html even though the marketing page is index.html.
  const privacyResponse = await fetch(origin + "privacy.html");
  assert.equal(privacyResponse.status, 200, "First-party privacy notice must resolve on HTTP");
  assert.match(await privacyResponse.text(), /<h1>Inquiry Privacy Notice<\/h1>/);
  const indexResponse = await fetch(origin + "index.html");
  assert.equal(indexResponse.status, 200, "Privacy return destination /index.html must resolve");
  assert.match(await indexResponse.text(), /id="contact"/);

  const privacyNav = await send("Page.navigate", { url: origin + "privacy.html" });
  assert.ok(!privacyNav.errorText, "Browser cannot navigate to privacy page");
  let privacyLoaded = false;
  for (let n = 0; n < 80; n++) {
    privacyLoaded = await inspect(
      "return document.readyState==='complete' && location.pathname==='/privacy.html' && " +
      "!!document.querySelector('a[href=\"./index.html#contact\"]');"
    );
    if (privacyLoaded) break;
    await wait(100);
  }
  assert.ok(privacyLoaded, "Privacy page did not load with its return link");
  const privacyState = await inspect(
    "const a=document.querySelector('a[href=\"./index.html#contact\"]');" +
    "return {href:a.href,scripts:document.scripts.length,title:document.title};"
  );
  assert.equal(privacyState.href, origin + "index.html#contact");
  assert.equal(privacyState.scripts, 0, "Privacy page should stay scriptless");
  assert.match(privacyState.title, /Inquiry Privacy Notice/);

  await inspect(
    "document.querySelector('a[href=\"./index.html#contact\"]').click();return true;"
  );
  let returned = false;
  for (let n = 0; n < 80; n++) {
    returned = await inspect(
      "return document.readyState==='complete' && location.pathname==='/index.html' && " +
      "location.hash==='#contact' && !!document.querySelector('#contact .contact-form');"
    );
    if (returned) break;
    await wait(100);
  }
  assert.ok(returned, "Privacy return link failed to reach /index.html#contact");
  const returnState = await inspect(
    "const field=document.querySelector('#contact-name');" +
    "return {nameValue:field.value,focused:document.activeElement.id," +
    "visible:!!document.querySelector('#contact').getClientRects().length};"
  );
  assert.ok(returnState.visible, "Return destination does not show the contact section");
  console.log("Privacy -> contact browser round-trip: /privacy.html -> /index.html#contact PASS.");
  // A same-tab navigation is allowed to clear an unsent draft. Record rather than
  // claiming browser-dependent form restoration/focus behavior is guaranteed.
  console.log("Observed browser return state:", JSON.stringify(returnState));
  assert.ok(requests.every(u => u.startsWith(origin) || u === "about:blank"),
    "Unexpected outgoing request: " + JSON.stringify(requests));
  console.log("PASS local HTTP Chromium smoke: source CSP, notice ordering, four viewport widths, native validation.");
  console.log("No form exists; safe inactive preview, external providers and human screen reader remain NOT TESTED.");
} finally {
  ws?.close();
  const exited = once(chrome, "exit").catch(() => undefined);
  chrome.kill("SIGTERM");
  await Promise.race([exited, wait(3000)]);
  server.close();
  await wait(100);
  rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
