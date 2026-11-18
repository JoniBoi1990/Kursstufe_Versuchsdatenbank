import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("index.html meets offline file://, accessibility, and DOM contract", () => {
  const html = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/index.html"), "utf8");
  assert.match(html, /<meta\s+name="color-scheme"\s+content="light dark"/i);
  assert.doesNotMatch(html, /<(script|link)[^>]+https?:\/\//i);
  assert.doesNotMatch(html, /<table\b/i);
  assert.match(html, /<script\s+defer\s+src="data\/kh_nachweise\.js"><\/script>/);
  assert.match(html, /<script\s+defer\s+src="data\/proteine_nachweise\.js"><\/script>/);
  assert.match(html, /<script\s+defer\s+src="app\.js"><\/script>/);

  for (const id of [
    "mode-catalog-btn",
    "mode-path-btn",
    "lf-toggle-btn",
    "theme-toggle-btn",
    "catalog-controls",
    "search-input",
    "category-chips",
    "experiment-grid",
    "lab-workspace",
    "lab-panel",
    "theory-panel",
    "experiment-header",
    "sample-buttons",
    "reagent-btn",
    "reset-btn",
    "temp-control-container",
    "vessel-stage",
    "lab-observation",
    "summary-card",
    "particle-stage",
    "lf-container",
    "learning-path-footer",
    "path-progress-text",
    "path-progress-bar",
    "mark-done-btn",
    "prev-exp-btn",
    "next-exp-btn"
  ]) {
    assert.ok(html.includes(`id="${id}"`), `Missing element id="${id}"`);
  }
  assert.doesNotMatch(html, /<summary>[\s\S]*?<h[1-6]\b/i);
  assert.match(html, /assets\/birklehof_logo\.png/);
  assert.match(html, /assets\/mint_logo\.png/);
});

test("style.css implements Modern Web Guidance for dark-mode, accordion, responsive containers, and LF styling", () => {
  const css = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/style.css"), "utf8");
  assert.match(css, /color-scheme:\s*light dark/);
  assert.match(css, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(css, /light-dark\(/);
  assert.match(css, /details::details-content/);
  assert.match(css, /interpolate-size:\s*allow-keywords/);
  assert.match(css, /transition-behavior:\s*allow-discrete/);
  assert.match(css, /contain:\s*layout/);
  assert.match(css, /@container\b/);
  assert.match(css, /\d+dvh\b/);
  assert.match(css, /aspect-ratio:/);
  assert.match(css, /clamp\(/);
  assert.match(css, /\.lf-box\b/);
  assert.match(css, /#f3effd/i);
  assert.match(css, /#5b3cc4/i);
  assert.match(css, /#231d3a/i);
});
