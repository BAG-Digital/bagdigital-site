/**
 * Dependency-free Chromium visual smoke test for the PUBLIC homepage only.
 *
 * Launches a local HTTP server, then verifies actual browser layout and mobile
 * navigation through Chrome DevTools Protocol (CDP). Does not submit forms,
 * contact providers, create customer accounts, or load external data.
 *
 * GitHub Actions ubuntu-latest includes Chrome. Local macOS developers can
 * run this with Chrome installed and CHROME_BIN pointing to the executable.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";

const ROOT = resolve(".");
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/privacy.html", ["privacy.html", "text/html; charset=utf-8"]],
]);
const sleep = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

function browserBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  const result = candidates.find((path) => path && existsSync(path));
  assert.ok(result, "Chrome/Chromium is required for real-browser UI smoke tests");
  return result;
}

function localServer() {
  return createServer((req, res) => {
    const [path] = (req.url || "/").split("?");
    const file = files.get(path);

    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    try {
      const body = readFileSync(join(ROOT, file[0]));
      res.writeHead(200, {
        "Content-Type": file[1],
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end("Fixture unavailable");
    }
  });
}

async function waitForDevtools(userDataDir, childProcess) {
  const configFile = join(userDataDir, "DevToolsActivePort");

  for (let attempt = 0; attempt < 120; attempt += 1) {
    assert.equal(childProcess.exitCode, null, "Browser exited during startup");
    if (existsSync(configFile)) {
      const [port, path] = readFileSync(configFile, "utf8").trim().split("\n");
      assert.ok(port && path, "Chrome debugging endpoint is incomplete");
      return "ws://127.0.0.1:" + port + path;
    }
    await sleep(100);
  }

  throw new Error("Chrome debugging endpoint did not become ready");
}

async function connectDebugger(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;

    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);

    if (message.error) {
      task.reject(new Error(message.error.message || "Chrome CDP error"));
    } else {
      task.resolve(message.result || {});
    }
  });

  await new Promise((resolveConnected, rejectConnection) => {
    socket.addEventListener("open", resolveConnected, { once: true });
    socket.addEventListener("error", () => rejectConnection(new Error("Unable to connect to Chrome")), { once: true });
  });

  return {
    async call(method, params = {}, sessionId) {
      const id = ++nextId;
      const promise = new Promise((resolveCall, rejectCall) => {
        pending.set(id, { resolve: resolveCall, reject: rejectCall });
      });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return promise;
    },
    close() {
      socket.close();
    },
  };
}

async function waitForDocument(cdp, sessionId) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await cdp.call("Runtime.evaluate", {
      expression: "document.readyState === 'complete'",
      returnByValue: true,
    }, sessionId);

    if (result.result?.value === true) return;
    await sleep(100);
  }
  throw new Error("Homepage did not reach a complete document state");
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, sessionId);

  if (result.exceptionDetails) {
    throw new Error("Browser expression failed: " + result.exceptionDetails.text);
  }
  return result.result?.value;
}

const layoutExpression = String.raw`(() => {
  const width = window.innerWidth;
  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width, height: box.height };
  };
  return {
    width,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
    headingCount: document.querySelectorAll('h1').length,
    heading: rect('h1'),
    mainCta: rect('.hero-actions .button-primary'),
    emailField: rect('input[name=email]'),
    contactSection: rect('#contact'),
    nav: rect('#primaryNav'),
    menuToggle: rect('#navToggle'),
    htmlReady: document.readyState,
  };
})()`;

async function run() {
  const server = localServer();
  const userDataDir = mkdtempSync(join(tmpdir(), "bagdigital-site-ui-"));
  let browser;
  let cdp;

  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const host = "http://127.0.0.1:" + server.address().port;

    browser = spawn(browserBinary(), [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--no-proxy-server",
      "--remote-debugging-port=0",
      "--user-data-dir=" + userDataDir,
      "about:blank",
    ], { stdio: "ignore" });

    const websocketUrl = await waitForDevtools(userDataDir, browser);
    cdp = await connectDebugger(websocketUrl);

    const target = await cdp.call("Target.createTarget", { url: "about:blank" });
    const attached = await cdp.call("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const session = attached.sessionId;
    await cdp.call("Page.enable", {}, session);
    await cdp.call("Runtime.enable", {}, session);
    await cdp.call("Accessibility.enable", {}, session);

    const results = [];

    for (const width of [320, 375, 768, 1440]) {
      const height = width < 768 ? 820 : 900;

      await cdp.call("Emulation.setDeviceMetricsOverride", {
        width, height, deviceScaleFactor: 1, mobile: width < 768,
      }, session);
      await cdp.call("Page.navigate", { url: host + "/" }, session);
      await waitForDocument(cdp, session);

      const layout = await evaluate(cdp, session, layoutExpression);
      assert.ok(layout, "browser did not return layout evidence");
      assert.equal(layout.width, width, "wrong emulated viewport");
      assert.equal(layout.headingCount, 1, "missing or repeated h1");
      assert.ok(layout.scrollWidth <= width + 2, "horizontal overflow at " + width + ": " + layout.scrollWidth);
      assert.ok(layout.heading && layout.heading.left >= -2 && layout.heading.right <= width + 2, "heading clips at " + width);
      assert.ok(layout.mainCta && layout.mainCta.left >= -2 && layout.mainCta.right <= width + 2, "primary CTA clips at " + width);
      assert.ok(layout.emailField && layout.emailField.left >= -2 && layout.emailField.right <= width + 2, "contact email clips at " + width);
      assert.ok(layout.contactSection, "contact section missing");
      assert.ok(layout.title.includes("BAGDigital"), "page title missing");

      if (width === 375 || width === 1440) {
        const accessibility = await cdp.call("Accessibility.getFullAXTree", {}, session);
        const accessibleNodes = (accessibility.nodes || [])
          .filter((node) => !node.ignored)
          .map((node) => ({ role: node.role?.value, name: node.name?.value || "" }));

        const has = (role, name) => accessibleNodes.some((node) =>
          node.role === role && (name ? node.name.includes(name) : true)
        );

        assert.ok(has("main"), "main landmark missing from accessibility tree");
        assert.ok(has("navigation", "Primary navigation"), "navigation landmark not named");
        assert.ok(has("heading", "Keep your software"), "homepage heading not exposed");
        assert.ok(has("button", "Send inquiry"), "send-inquiry action has no accessible name");
        assert.ok(has("textbox", "Email"), "contact email field has no accessible name");
      }

      if (width === 375) {
        const before = await evaluate(cdp, session, "document.querySelector('#navToggle').getAttribute('aria-expanded')");
        assert.equal(before, "false", "mobile menu should start closed");

        const opened = await evaluate(cdp, session, String.raw`(() => {
          document.querySelector('#navToggle').click();
          return document.querySelector('#navToggle').getAttribute('aria-expanded');
        })()`);
        assert.equal(opened, "true", "mobile menu toggle did not open");

        const closed = await evaluate(cdp, session, String.raw`(() => {
          document.querySelector('#primaryNav a').focus();
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          return {
            expanded: document.querySelector('#navToggle').getAttribute('aria-expanded'),
            focusReturned: document.activeElement === document.querySelector('#navToggle')
          };
        })()`);
        assert.equal(closed.expanded, "false", "Escape failed to close mobile menu");
        assert.equal(closed.focusReturned, true, "Escape should return keyboard focus to Menu");

        const followingLink = await evaluate(cdp, session, String.raw`(() => {
          document.querySelector('#navToggle').click();
          const link = document.querySelector('#primaryNav a[href="#examples"]');
          link.focus();
          link.click();
          return {
            expanded: document.querySelector('#navToggle').getAttribute('aria-expanded'),
            sectionFocused: document.activeElement === document.querySelector('#examples'),
            destination: window.location.hash
          };
        })()`);
        assert.equal(followingLink.expanded, "false", "mobile menu link should close menu");
        assert.equal(followingLink.sectionFocused, true, "mobile menu navigation must move focus to selected section");
        assert.equal(followingLink.destination, "#examples", "mobile menu navigation should keep real anchor destination");
      }

      results.push({ viewport: width, pageWidth: layout.scrollWidth, h1: layout.headingCount, ctaWidth: Math.round(layout.mainCta.width), status: "PASS" });
    }

    process.stdout.write(JSON.stringify({ browserViewportChecks: results }, null, 2) + "\n");
  } finally {
    try { cdp?.close(); } catch { /* best effort */ }
    if (browser && browser.exitCode === null) {
      browser.kill("SIGTERM");
      const exited = await Promise.race([
        once(browser, "exit").then(() => true),
        sleep(2_000).then(() => false),
      ]);
      if (!exited && browser.exitCode === null) {
        browser.kill("SIGKILL");
        await once(browser, "exit");
      }
    }
    await new Promise((resolveClose) => server.close(resolveClose));
    // Chrome may still be flushing its temporary user profile just after exit.
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

run().catch((error) => {
  process.stderr.write("Website browser QA FAILED: " + error.message + "\n");
  process.exitCode = 1;
});
