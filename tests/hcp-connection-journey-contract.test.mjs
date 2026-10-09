import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const htmlLocation = new URL("../.github/design-concepts/hcp-connection-journey.html", import.meta.url);
const cssLocation = new URL("../.github/design-concepts/hcp-connection-journey.css", import.meta.url);
const html = readFileSync(htmlLocation, "utf8");
const css = readFileSync(cssLocation, "utf8");
const publicHome = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("design preview is explicitly not a live portal or customer connection", () => {
  assert.match(html, /DESIGN STUDY \/ NOT A LIVE PORTAL/);
  assert.match(html, /Example screens only/);
  assert.match(html, /EXAMPLE \/ NOT LIVE/);
  assert.match(html, /NOT CONNECTED/);
  assert.match(html, /BASIC CONNECTION \/ EXAMPLE/);
  assert.match(html, /EXAMPLE A/);
  assert.match(html, /A future successful check could confirm/);
  assert.match(html, /These examples don't show a live account/);
});

test("there are no executable actions, credential inputs, scripts or provider calls", () => {
  assert.doesNotMatch(html, /<(?:script|form|input|textarea|iframe|button|select)\b/i);
  assert.doesNotMatch(html, /(?:localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|navigator\.|onerror=|onclick=)/i);
  assert.doesNotMatch(html, /(?:HCP_API_KEY|sk-proj-|Bearer\s+[a-z0-9]+|https?:\/\/api\.housecallpro)/i);
  assert.doesNotMatch(css, /(?:@import|url\s*\()/i);
  assert.match(html, /Connect account \/ unavailable/);
  assert.doesNotMatch(html, /Francisco(?:'|’|&apos;)s Roofing/i);
});

test("preview is search-hidden, external-resource-blocked and locally styled", () => {
  assert.match(html, /content="noindex,nofollow,noarchive"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /style-src 'self'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /href="\.\/hcp-connection-journey\.css"/);
  assert.doesNotMatch(html, /href="https?:\/\//);
  assert.doesNotMatch(html, /src="https?:\/\//);
});

test("all links stay on the page and have real destinations", () => {
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)];
  assert.ok(anchors.length >= 5, "expected visible internal navigation");
  for (const [, destination] of anchors) {
    assert.ok(destination.startsWith("#"), "outbound or live-looking link found");
    assert.ok(html.includes('id="' + destination.slice(1) + '"'), "missing target " + destination);
  }
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /<main id="main">/);
});

test("status cards distinguish readiness from provider and credential authorization", () => {
  assert.match(html, /Review and approve the connection/);
  assert.match(html, /Check the connection/);
  assert.match(html, /Review what information a connection can use/);
  assert.match(html, /You'll know the next step/);
  assert.match(html, /No changes made/);
  assert.match(html, /Select the business account you want to use/);
  assert.match(html, /Housecall Pro isn't connected in this preview/);
});

test("layout includes keyboard, narrow-screen and reduced-motion affordances", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /<ol class="journey">/);
});

test("public BAGDigital homepage does not expose the unpublished concept", () => {
  assert.ok(htmlLocation.pathname.includes("/.github/design-concepts/"));
  assert.doesNotMatch(publicHome, /hcp-connection-journey\.html/);
  assert.doesNotMatch(publicHome, /design-concepts\//);
});


function relativeLuminance(hexColor) {
  const hex = hexColor.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((first, second) => second - first);

  return (lighter + 0.05) / (darker + 0.05);
}

function paletteColor(variableName) {
  const escapedName = variableName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const cssVariable = css.match(new RegExp("--" + escapedName + ":\\s*(#[0-9a-fA-F]{6})"));

  assert.ok(cssVariable, "missing palette variable " + variableName);
  return cssVariable[1];
}

test("primary and muted text contrast ratios remain WCAG AA in the defined dark palette", () => {
  const combinations = [
    ["text on page", paletteColor("text"), paletteColor("bg")],
    ["muted text on a panel", paletteColor("muted"), paletteColor("surface")],
    ["subtle text on a panel", paletteColor("subtle"), paletteColor("surface")],
    ["accent text on a panel", paletteColor("acid"), paletteColor("surface")],
  ];

  for (const [description, foreground, background] of combinations) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      description + " must have at least 4.5:1 contrast",
    );
  }
});

test("document outline, IDs, and section labels are internally consistent", () => {
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(allIds).size, allIds.length, "duplicate element ID");
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, "exactly one primary heading expected");

  for (const [, reference] of html.matchAll(/\baria-labelledby="([^"]+)"/g)) {
    for (const id of reference.split(/\s+/)) {
      assert.ok(allIds.includes(id), "aria-labelledby target missing: " + id);
    }
  }
});


test("customer-facing copy explains outcomes without internal engineering jargon", () => {
  const internalTerms = /\b(?:API|AWS|GitHub|Vercel|PostgreSQL|RLS|tenant|infrastructure|credential|webhook|OAuth|M9|RT-M3-11|CI)\b|GET\s*\/company/i;
  assert.doesNotMatch(html, internalTerms, "internal implementation details belong in docs, not customer screens");
  assert.match(html, /Your tools\./);
  assert.match(html, /what's connected, what's available, and what needs attention/);
  assert.match(html, /what information can be shared before you approve/);
  assert.match(html, /Other features may still be unavailable/);
  assert.match(html, /Design preview only/);
});
