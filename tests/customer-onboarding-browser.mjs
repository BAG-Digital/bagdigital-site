import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(".github/design-concepts");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const FILES = new Map([
  ["/", ["customer-onboarding.html", "text/html; charset=utf-8"]],
  ["/customer-onboarding.html", ["customer-onboarding.html", "text/html; charset=utf-8"]],
  ["/customer-onboarding.css", ["customer-onboarding.css", "text/css; charset=utf-8"]],
  ["/customer-onboarding.js", ["customer-onboarding.js", "application/javascript; charset=utf-8"]],
]);

function chromePath() {
  const binary = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((candidate) => candidate && existsSync(candidate));
  assert.ok(binary, "Chrome/Chromium is required for the onboarding browser test");
  return binary;
}

function fixture() {
  return createServer((req, res) => {
    const requested = (req.url || "/").split("?")[0];
    const file = FILES.get(requested);
    if (!file) { res.writeHead(404); res.end("Not found"); return; }
    try {
      res.writeHead(200, {
        "Content-Type": file[1],
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(readFileSync(join(ROOT, file[0])));
    } catch {
      res.writeHead(500); res.end("Preview unavailable");
    }
  });
}

async function debuggerUrl(profile, proc) {
  for (let i = 0; i < 120; i += 1) {
    assert.equal(proc.exitCode, null, "Chrome exited during startup");
    const f = join(profile, "DevToolsActivePort");
    if (existsSync(f)) {
      const [port, route] = readFileSync(f, "utf8").trim().split("\n");
      return "ws://127.0.0.1:" + port + route;
    }
    await sleep(100);
  }
  throw new Error("Chrome devtools did not start");
}

async function connect(url) {
  const websocket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  websocket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id || !pending.has(message.id)) return;
    const item = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result || {});
  });
  await new Promise((ok, fail) => {
    websocket.addEventListener("open", ok, { once: true });
    websocket.addEventListener("error", () => fail(new Error("Chrome connection failed")), { once: true });
  });
  return {
    call(method, params = {}, sessionId) {
      const key = ++id;
      const done = new Promise((resolveCall, rejectCall) => pending.set(key, { resolve: resolveCall, reject: rejectCall }));
      websocket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
      return done;
    },
    close() { websocket.close(); },
  };
}

async function evaluate(client, session, expression) {
  const result = await client.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, session);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result?.value;
}

async function ready(cdp, session) {
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate(cdp, session, "document.readyState === 'complete'")) return;
    await sleep(100);
  }
  throw new Error("Preview did not load");
}

const stateExpr = String.raw`(() => {
  const active = document.querySelector('[data-screen]:not([hidden])');
  const activeHeading = active?.querySelector('h2');
  const next = document.querySelector('#continueBtn');
  const b = next?.getBoundingClientRect();
  return {
    width: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    h1s: document.querySelectorAll('h1').length,
    disclosure: document.querySelector('.preview-bar')?.textContent.includes('No account is created'),
    accountInput: document.querySelector('form,input,textarea,select') !== null,
    step: document.querySelector('#stepCount')?.textContent,
    activeId: active?.id,
    titleVisible: activeHeading && activeHeading.getBoundingClientRect().width > 0,
    nextVisible: b && b.left >= -2 && b.right <= innerWidth + 2 && b.width > 0,
    resources: performance.getEntriesByType('resource').map((r) => r.name).filter((name) => !name.startsWith(location.origin + '/'))
  };
})()`;

async function testJourney(cdp, session) {
  const initial = await evaluate(cdp, session, stateExpr);
  const initDiagnostics = await evaluate(cdp, session, String.raw`(() => ({
    scripts: Array.from(document.scripts).map((s) => s.src),
    stepTwoText: document.querySelector('[data-nav-step="1"] .step-state').textContent,
    onStepTwoHidden: document.querySelector('#screenBusiness').hasAttribute('hidden'),
    buttonDisabled: document.querySelector('#continueBtn').disabled,
    appError: window.__onboardingErrors || []
  }))()`);
  console.log("ONBOARDING_INIT_DIAGNOSTICS", JSON.stringify(initDiagnostics));
  assert.equal(initial.activeId, "screenAccount");

  const business = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#continueBtn').click();
    return {
      step: document.querySelector('#stepCount').textContent,
      active: document.querySelector('[data-screen]:not([hidden])').id,
      headingFocused: document.activeElement.id === 'panel-business-title'
    };
  })()`);
  assert.equal(business.step, "STEP 2 / 4");
  assert.equal(business.active, "screenBusiness");
  assert.equal(business.headingFocused, true);

  const joined = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#choiceJoin').click();
    return {
      pressed: document.querySelector('#choiceJoin').getAttribute('aria-pressed'),
      note: document.querySelector('#businessPreviewText').textContent
    };
  })()`);
  assert.equal(joined.pressed, "true");
  assert.match(joined.note, /fictional invitation/i);

  await evaluate(cdp, session, "document.querySelector('#continueBtn').click()");
  const chosen = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('[data-priority="admin"]').click();
    return document.querySelector('[data-priority="admin"]').getAttribute('aria-pressed');
  })()`);
  assert.equal(chosen, "true");

  await evaluate(cdp, session, "document.querySelector('#continueBtn').click()");
  const workspace = await evaluate(cdp, session, String.raw`(() => ({
    id: document.querySelector('[data-screen]:not([hidden])').id,
    business: document.querySelector('#workspaceBusiness').textContent,
    priority: document.querySelector('#selectedPriorityLabel').textContent,
    connected: Array.from(document.querySelectorAll('.status-grid strong')).map((node) => node.textContent),
    next: document.querySelector('#continueBtn').textContent
  }))()`);
  assert.equal(workspace.id, "screenWorkspace");
  assert.equal(workspace.business, "Example Team Co.");
  assert.equal(workspace.priority, "Less manual data entry");
  assert.deepEqual(workspace.connected, ["0", "0", "0"]);
  assert.match(workspace.next, /Restart preview/);

  const reset = await evaluate(cdp, session, String.raw`(() => {
    document.querySelector('#continueBtn').click();
    return {
      step: document.querySelector('#stepCount').textContent,
      businessMode: document.querySelector('#choiceCreate').getAttribute('aria-pressed'),
      priority: document.querySelector('[data-priority="followup"]').getAttribute('aria-pressed')
    };
  })()`);
  assert.equal(reset.step, "STEP 1 / 4");
  assert.equal(reset.businessMode, "true");
  assert.equal(reset.priority, "true");

  const ax = await cdp.call("Accessibility.getFullAXTree", {}, session);
  const named = (role, name) => (ax.nodes || []).some((node) =>
    !node.ignored && node.role?.value === role &&
    (node.name?.value || "").includes(name)
  );
  assert.ok(named("main", ""), "main landmark missing from accessibility tree");
  assert.ok(named("heading", "Make room for"), "primary heading has no accessible name");
  assert.ok(named("button", "Preview next step"), "continue button has no accessible name");

  return { businessSelection: true, joinPath: true, priorities: true, honestZeroConnection: true, restartClearsState: true, focusAndAX: true };
}

async function main() {
  const server = fixture();
  const profile = mkdtempSync(join(tmpdir(), "bag-onboard-"));
  let chrome;
  let cdp;
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = "http://127.0.0.1:" + server.address().port;
    chrome = spawn(chromePath(), [
      "--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
      "--no-sandbox", "--no-first-run", "--disable-background-networking",
      "--no-default-browser-check", "--no-proxy-server",
      "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank",
    ], { stdio: "ignore" });
    cdp = await connect(await debuggerUrl(profile, chrome));
    const target = await cdp.call("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.call("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const session = attached.sessionId;
    await cdp.call("Page.enable", {}, session);
    await cdp.call("Runtime.enable", {}, session);
    await cdp.call("Accessibility.enable", {}, session);
    await cdp.call("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__onboardingErrors=[];window.addEventListener('error',e=>window.__onboardingErrors.push(e.message));"
    }, session);

    const sizes = [];
    for (const width of [320, 375, 768, 1440]) {
      await cdp.call("Emulation.setDeviceMetricsOverride", {
        width, height: width < 768 ? 800 : 900, deviceScaleFactor: 1, mobile: width < 768
      }, session);
      await cdp.call("Page.navigate", { url: url + "/" }, session);
      await ready(cdp, session);
      const state = await evaluate(cdp, session, stateExpr);
      assert.equal(state.width, width);
      assert.equal(state.h1s, 1);
      assert.equal(state.disclosure, true);
      assert.equal(state.accountInput, false);
      assert.equal(state.titleVisible, true);
      assert.equal(state.nextVisible, true);
      assert.ok(state.pageWidth <= width + 2, "Horizontal overflow: " + width + " → " + state.pageWidth);
      assert.deepEqual(state.resources, [], "External network resource attempted");
      if (width === 375 || width === 1440) {
        const screenshot = await cdp.call("Page.captureScreenshot", {
          format: "png", fromSurface: true, captureBeyondViewport: true
        }, session);
        assert.ok(screenshot.data);
        const dir = resolve("onboarding-qa-screenshots");
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "onboarding-" + width + "px.png"), Buffer.from(screenshot.data, "base64"));
      }
      sizes.push({ width, pageWidth: state.pageWidth, status: "PASS" });
    }
    const behavior = await testJourney(cdp, session);
    process.stdout.write(JSON.stringify({ viewports: sizes, behavior, authStatus: "NON-LIVE DESIGN ONLY" }, null, 2) + "\n");
  } finally {
    try { cdp?.close(); } catch { /* best effort */ }
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
  process.stderr.write("Onboarding browser smoke FAILED: " + error.message + "\n");
  process.exitCode = 1;
});
