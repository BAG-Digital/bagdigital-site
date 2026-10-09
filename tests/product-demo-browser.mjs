import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve("prototypes/product-demo");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/demo.css", ["demo.css", "text/css; charset=utf-8"]],
  ["/demo.js", ["demo.js", "application/javascript; charset=utf-8"]],
]);

function chromePath() {
  const binaries = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const binary = binaries.find((path) => path && existsSync(path));
  assert.ok(binary, "Chrome is required for real-browser demo verification");
  return binary;
}

function fixtureServer() {
  return createServer((req, res) => {
    const path = (req.url || "/").split("?")[0];
    const file = FILES.get(path);
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    try {
      res.writeHead(200, {
        "Content-Type": file[1],
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(readFileSync(join(ROOT, file[0])));
    } catch {
      res.writeHead(500);
      res.end("Fixture unavailable");
    }
  });
}

async function debugPort(profile, process) {
  for (let i = 0; i < 120; i += 1) {
    assert.equal(process.exitCode, null, "Browser unexpectedly exited");
    const path = join(profile, "DevToolsActivePort");
    if (existsSync(path)) {
      const [port, route] = readFileSync(path, "utf8").trim().split("\n");
      assert.ok(port && route);
      return "ws://127.0.0.1:" + port + route;
    }
    await sleep(100);
  }
  throw new Error("Chrome debugging server did not start");
}

async function connect(url) {
  const websocket = new WebSocket(url);
  const tasks = new Map();
  let messageId = 0;

  websocket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id || !tasks.has(message.id)) return;
    const task = tasks.get(message.id);
    tasks.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result || {});
  });

  await new Promise((ok, fail) => {
    websocket.addEventListener("open", ok, { once: true });
    websocket.addEventListener("error", () => fail(new Error("Chrome debugger not reachable")), { once: true });
  });

  return {
    call(method, params = {}, sessionId) {
      const id = ++messageId;
      const promise = new Promise((ok, fail) => tasks.set(id, { resolve: ok, reject: fail }));
      websocket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return promise;
    },
    close() { websocket.close(); },
  };
}

async function evaluate(cdp, session, expression) {
  const r = await cdp.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, session);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || "Chrome script evaluation failed");
  return r.result?.value;
}

async function ready(cdp, session) {
  for (let i = 0; i < 100; i += 1) {
    const isReady = await evaluate(cdp, session, "document.readyState === 'complete'");
    if (isReady) return;
    await sleep(100);
  }
  throw new Error("Demo document did not load");
}

const readState = String.raw`(() => ({
  width: innerWidth,
  pageWidth: document.documentElement.scrollWidth,
  h1: document.querySelectorAll('h1').length,
  hasNotice: document.querySelector('.demo-notice')?.textContent.includes('Nothing is connected or sent'),
  hasCta: Boolean(document.querySelector('a[href^="mailto:"]')),
  advanceVisible: (() => { const r = document.querySelector('#advanceBtn').getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left >= -2 && r.right <= innerWidth + 2; })(),
  current: document.querySelector('#stepEyebrow')?.textContent,
  approval: document.querySelector('#approvalPill')?.textContent,
  draft: document.querySelector('#draftContent')?.textContent,
  servicePressed: document.querySelector('#serviceBtn')?.getAttribute('aria-pressed'),
  marketingPressed: document.querySelector('#marketingBtn')?.getAttribute('aria-pressed'),
  buttonDisabled: document.querySelector('#advanceBtn')?.disabled,
  externalResources: performance.getEntriesByType('resource').map((r) => r.name).filter((url) => !url.startsWith(location.origin + '/')),
  ready: document.readyState
}))()`;

async function workflowTests(cdp, session) {
  const initial = await evaluate(cdp, session, readState);
  assert.equal(initial.current, "STEP 1 OF 4");
  assert.equal(initial.approval, "NOT REVIEWED");
  assert.equal(initial.servicePressed, "true");

  const organized = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#advanceBtn').click();
    return [document.querySelector('#stepEyebrow').textContent, document.querySelector('#draftIndicator').textContent];
  })()`);
  assert.deepEqual(organized, ["STEP 2 OF 4", "NOT PREPARED"]);

  const drafted = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#advanceBtn').click();
    return {
      step: document.querySelector('#stepEyebrow').textContent,
      approval: document.querySelector('#approvalPill').textContent,
      draft: document.querySelector('#draftContent').textContent
    };
  })()`);
  assert.equal(drafted.step, "STEP 3 OF 4");
  assert.equal(drafted.approval, "AWAITING REVIEW");
  assert.match(drafted.draft, /skylight leak/);

  const approved = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#advanceBtn').click();
    return {
      step: document.querySelector('#stepEyebrow').textContent,
      approval: document.querySelector('#approvalPill').textContent,
      disabled: document.querySelector('#advanceBtn').disabled,
      reminder: document.querySelector('#reviewReminder').textContent
    };
  })()`);
  assert.equal(approved.step, "STEP 4 OF 4");
  assert.equal(approved.approval, "APPROVED IN DEMO");
  assert.equal(approved.disabled, true);
  assert.match(approved.reminder, /No message was sent/);

  const switched = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#marketingBtn').click();
    return {
      step: document.querySelector('#stepEyebrow').textContent,
      marketing: document.querySelector('#marketingBtn').getAttribute('aria-pressed'),
      service: document.querySelector('#serviceBtn').getAttribute('aria-pressed'),
      source: document.querySelector('#sourceLabel').textContent,
      text: document.querySelector('#incomingMessage').textContent,
      approval: document.querySelector('#approvalPill').textContent
    };
  })()`);
  assert.equal(switched.step, "STEP 1 OF 4", "switching workflows must clear previous approval");
  assert.equal(switched.marketing, "true");
  assert.equal(switched.service, "false");
  assert.match(switched.source, /simulated/);
  assert.match(switched.text, /café/);
  assert.equal(switched.approval, "NOT REVIEWED");

  const marketingDraft = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#advanceBtn').click();
    document.querySelector('#advanceBtn').click();
    return document.querySelector('#draftContent').textContent;
  })()`);
  assert.match(marketingDraft, /budget/);
  assert.match(marketingDraft, /promot/);

  const reset = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#resetBtn').click();
    return {
      phase: document.querySelector('#stepEyebrow').textContent,
      approval: document.querySelector('#approvalPill').textContent,
      focus: document.activeElement.id
    };
  })()`);
  assert.equal(reset.phase, "STEP 1 OF 4");
  assert.equal(reset.approval, "NOT REVIEWED");
  assert.equal(reset.focus, "advanceBtn");

  const ax = await cdp.call("Accessibility.getFullAXTree", {}, session);
  const accessible = (ax.nodes || []).filter((node) => !node.ignored);
  const named = (role, fragment) =>
    accessible.some((node) => node.role?.value === role && (node.name?.value || "").includes(fragment));

  assert.ok(named("main", ""), "main landmark missing from AX tree");
  assert.ok(named("heading", "Less busywork"), "primary heading missing from AX tree");
  assert.ok(named("button", "Marketing agency"), "scenario button accessible name missing");
  assert.ok(named("button", "Organize this request"), "next-step button accessible name missing");

  return { serviceOrganize: true, draftBeforeApproval: true, simulatedApprovalOnly: true, scenarioSwitchResets: true, marketingCreativeBrief: true, keyboardResetFocus: true, accessibilityTree: true };
}

async function main() {
  const server = fixtureServer();
  const profile = mkdtempSync(join(tmpdir(), "bagdigital-sales-demo-"));
  let chrome;
  let cdp;

  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = "http://127.0.0.1:" + server.address().port;

    chrome = spawn(chromePath(), [
      "--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
      "--no-sandbox", "--no-first-run", "--no-default-browser-check",
      "--disable-background-networking", "--no-proxy-server",
      "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank",
    ], { stdio: "ignore" });

    cdp = await connect(await debugPort(profile, chrome));
    const target = await cdp.call("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.call("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const session = attached.sessionId;
    await cdp.call("Page.enable", {}, session);
    await cdp.call("Runtime.enable", {}, session);
    await cdp.call("Accessibility.enable", {}, session);

    const viewports = [];

    for (const width of [320, 375, 768, 1440]) {
      await cdp.call("Emulation.setDeviceMetricsOverride", {
        width, height: width < 768 ? 820 : 900, deviceScaleFactor: 1, mobile: width < 768,
      }, session);

      await cdp.call("Page.navigate", { url: url + "/" }, session);
      await ready(cdp, session);
      const state = await evaluate(cdp, session, readState);

      assert.equal(state.width, width);
      assert.equal(state.h1, 1);
      assert.equal(state.hasNotice, true);
      assert.equal(state.hasCta, true);
      assert.equal(state.advanceVisible, true);
      assert.equal(state.ready, "complete");
      assert.equal(state.pageWidth <= width + 2, true, "Horizontal overflow at " + width + ": " + state.pageWidth);
      assert.deepEqual(state.externalResources, [], "Unexpected external resource at width " + width);
      assert.equal(state.approval, "NOT REVIEWED");

      if (width === 375 || width === 1440) {
        const screenshot = await cdp.call("Page.captureScreenshot", {
          format: "png", fromSurface: true, captureBeyondViewport: true,
        }, session);
        assert.ok(screenshot.data);
        const folder = resolve("demo-qa-screenshots");
        mkdirSync(folder, { recursive: true });
        writeFileSync(join(folder, "demo-" + width + "px.png"), Buffer.from(screenshot.data, "base64"));
      }

      viewports.push({ width, pageWidth: state.pageWidth, status: "PASS" });
    }

    const behavior = await workflowTests(cdp, session);
    process.stdout.write(JSON.stringify({ viewports, behavior, network: "no external resources observed" }, null, 2) + "\n");
  } finally {
    try { cdp?.close(); } catch { /* best-effort teardown */ }
    if (chrome && chrome.exitCode === null) {
      chrome.kill("SIGTERM");
      const exited = await Promise.race([once(chrome, "exit").then(() => true), sleep(2000).then(() => false)]);
      if (!exited && chrome.exitCode === null) {
        chrome.kill("SIGKILL");
        await once(chrome, "exit");
      }
    }
    await new Promise((done) => server.close(done));
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

main().catch((error) => {
  process.stderr.write("BAGDigital interactive demo browser test FAILED: " + error.message + "\n");
  process.exitCode = 1;
});
