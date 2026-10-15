// Synthetic browser verification only. NEVER submits the form or contacts FormSubmit.co.
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
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]]
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
    "const f=document.querySelector('.contact-form');" +
    "const d=document.querySelector('#contact-data-note');" +
    "const c=document.querySelector('.contact-consent');" +
    "return {action:f.action,method:f.method,scripts:document.scripts.length," +
    "style:getComputedStyle(f).display,disclosed:!!d&&!!c&&!!(d.compareDocumentPosition(c)&4)," +
    "csp:document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]').content};"
  );
  assert.equal(source.action, "https://formsubmit.co/jaime@bagdigital.tech");
  assert.equal(source.method, "post");
  assert.equal(source.scripts, 0);
  assert.ok(source.style !== "none" && source.disclosed);
  assert.ok(source.csp.includes("connect-src 'none'"));
  assert.ok(source.csp.includes("form-action https://formsubmit.co"));
  for (const width of [320, 375, 768, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await wait(120);
    const reflow = await inspect(
      "return {view:document.documentElement.clientWidth,full:document.documentElement.scrollWidth," +
      "visible:!!document.querySelector('.contact-form').getClientRects().length};"
    );
    assert.ok(reflow.visible, "Form hidden at " + width);
    assert.ok(reflow.full <= reflow.view + 1, "Horizontal overflow at " + width + ": " + JSON.stringify(reflow));
  }
  await send("Emulation.clearDeviceMetricsOverride");
  const results = await inspect(
    "const f=document.querySelector('.contact-form');" +
    "const n=f.elements.namedItem('name'),e=f.elements.namedItem('email')," +
    "s=f.elements.namedItem('interest'),m=f.elements.namedItem('message'),c=f.elements.namedItem('processing_ack');" +
    "const empty=!f.checkValidity();n.value='Synthetic QA';e.value='bad-email';" +
    "const invalid=e.validity.typeMismatch;e.value='qa@example.com';" +
    "s.value='Not sure yet';m.value='No data submitted; local test only';" +
    "const unchecked=!f.checkValidity()&&c.validity.valueMissing;" +
    "c.checked=true;const complete=f.checkValidity();return {empty,invalid,unchecked,complete};"
  );
  assert.deepEqual(results, { empty: true, invalid: true, unchecked: true, complete: true });
  // Check labels and actual Chromium keyboard order without submitting anything.
  const labels = await inspect(
    "return ['contact-name','contact-email','contact-business','contact-service'," +
    "'contact-details','contact-consent'].map(id => {" +
    "const element=document.getElementById(id);" +
    "return !!element && element.labels.length>0 && element.labels[0].textContent.trim().length>0;" +
    "});"
  );
  assert.ok(labels.every(Boolean), "Contact inputs need corresponding accessible labels");
  await inspect("document.querySelector('#contact-name').focus();return true;");
  await send("Input.dispatchKeyEvent", {
    type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9
  });
  assert.equal(await inspect("return document.activeElement.id;"), "contact-email",
    "Tab after the name field should focus the email input");

  assert.ok(requests.every(u => u.startsWith(origin) || u === "about:blank"),
    "Unexpected outgoing request: " + JSON.stringify(requests));
  console.log("PASS local HTTP Chromium smoke: source CSP, notice ordering, four viewport widths, native validation.");
  console.log("No form submission attempted. CAPTCHA, human screen reader and public host remain NOT TESTED.");
} finally {
  ws?.close();
  const exited = once(chrome, "exit").catch(() => undefined);
  chrome.kill("SIGTERM");
  await Promise.race([exited, wait(3000)]);
  server.close();
  await wait(100);
  rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
