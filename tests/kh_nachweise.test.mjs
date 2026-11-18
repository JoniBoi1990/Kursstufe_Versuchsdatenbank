import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadKhModule() {
  const filePath = path.resolve("Kursstufe_Versuchsdatenbank/data/kh_nachweise.js");
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.VERSUCHS_DATENBANK;
}

test("registers all 4 carbohydrate detection experiments", () => {
  const db = loadKhModule();
  assert.deepEqual(
    Array.from(db.experiments, (e) => e.id),
    ["god-test", "benedict-probe", "tollens-probe", "iod-probe"]
  );
  assert.ok(db.categories.includes("Kohlenhydrate"));
});

test("GOD-Test is strictly specific for D-Glucose at room temperature", () => {
  const db = loadKhModule();
  const god = db.experiments.find((e) => e.id === "god-test");
  assert.equal(god.labConfig.supportsHeating, false);
  const pos = god.labConfig.getOutcome("glucose", { reagentAdded: true, heated: false });
  assert.equal(pos.statusBadge, "positive");
  assert.ok(pos.stripPadColor);
  for (const neg of ["fructose", "maltose", "saccharose", "wasser"]) {
    assert.equal(god.labConfig.getOutcome(neg, { reagentAdded: true, heated: false }).statusBadge, "negative");
  }
  const lfHtml = god.lfSection.blocks.map((b) => b.html + " " + b.heading).join(" ");
  assert.match(lfHtml, /Mutarotation/i);
  assert.match(lfHtml, /nicht relevant für das Abitur/i);
  assert.match(lfHtml, /H<sub>2<\/sub>O<sub>2<\/sub>/i);
  assert.match(lfHtml, /Peroxidase/i);

  const posSvg = god.particleModel.renderSvg("glucose", { reagentAdded: true, heated: false, outcome: pos });
  const negSvg = god.particleModel.renderSvg("fructose", {
    reagentAdded: true,
    heated: false,
    outcome: god.labConfig.getOutcome("fructose", { reagentAdded: true, heated: false })
  });
  assert.match(posSvg, /<svg[^>]*>/);
  assert.doesNotMatch(posSvg, /H₂O₂/);
  assert.match(negSvg, /D-Fructose/);
  assert.doesNotMatch(negSvg, /H₂O₂/);
  assert.match(negSvg, /Schlüssel-Schloss passt nicht.*Testfeld.*gelb/i);
});

test("Benedict and Tollens require reagent before heat and distinguish reducing vs non-reducing", () => {
  const db = loadKhModule();
  const benedict = db.experiments.find((e) => e.id === "benedict-probe");
  const tollens = db.experiments.find((e) => e.id === "tollens-probe");

  // Review Focus #1: heating before reagent must stay pending-reagent
  assert.equal(benedict.labConfig.getOutcome("glucose", { reagentAdded: false, heated: true }).statusBadge, "pending-reagent");
  assert.equal(tollens.labConfig.getOutcome("glucose", { reagentAdded: false, heated: true }).statusBadge, "pending-reagent");

  for (const pos of ["glucose", "fructose", "maltose"]) {
    const bCold = benedict.labConfig.getOutcome(pos, { reagentAdded: true, heated: false });
    const bHot = benedict.labConfig.getOutcome(pos, { reagentAdded: true, heated: true });
    assert.equal(bCold.statusBadge, "pending-heat");
    assert.equal(bCold.precipitateColor, null);
    assert.equal(bHot.statusBadge, "positive");
    assert.ok(bHot.precipitateColor);

    const tCold = tollens.labConfig.getOutcome(pos, { reagentAdded: true, heated: false });
    const tHot = tollens.labConfig.getOutcome(pos, { reagentAdded: true, heated: true });
    assert.equal(tCold.mirrorEffect, false);
    assert.equal(tHot.statusBadge, "positive");
    assert.equal(tHot.mirrorEffect, true);
  }

  assert.equal(benedict.labConfig.getOutcome("saccharose", { reagentAdded: true, heated: true }).statusBadge, "negative");
  assert.equal(benedict.labConfig.getOutcome("staerke", { reagentAdded: true, heated: true }).statusBadge, "negative");
  assert.equal(tollens.labConfig.getOutcome("saccharose", { reagentAdded: true, heated: true }).statusBadge, "negative");
  assert.match(benedict.lfSection.blocks.map((b) => b.html).join(" "), /Keto-Enol-Tautomerie/i);
  assert.match(tollens.lfSection.blocks.map((b) => b.html).join(" "), /Ag\(NH<sub>3<\/sub>\)<sub>2<\/sub>/i);
});

test("Iod-Probe shows reversible thermal decolorization and hexagon-chain SVGs", () => {
  const db = loadKhModule();
  const iod = db.experiments.find((e) => e.id === "iod-probe");

  // Review Focus #2: 20°C -> 80°C -> 20°C reversibility
  const amyloseCold = iod.labConfig.getOutcome("amylose", { reagentAdded: true, heated: false });
  const amyloseHot = iod.labConfig.getOutcome("amylose", { reagentAdded: true, heated: true });
  const amyloseCooled = iod.labConfig.getOutcome("amylose", { reagentAdded: true, heated: false });
  assert.equal(amyloseCold.statusBadge, "positive");
  assert.equal(amyloseCold.liquidColor, "#141b4d");
  assert.equal(amyloseHot.statusBadge, "reversible-heated");
  assert.equal(amyloseHot.liquidColor, "#f6e8a6");
  assert.equal(amyloseCooled.liquidColor, "#141b4d");

  const amylopektinCold = iod.labConfig.getOutcome("amylopektin", { reagentAdded: true, heated: false });
  const amylopektinHot = iod.labConfig.getOutcome("amylopektin", { reagentAdded: true, heated: true });
  assert.equal(amylopektinCold.statusBadge, "positive");
  assert.equal(amylopektinCold.liquidColor, "#5b234d");
  assert.equal(amylopektinHot.statusBadge, "reversible-heated");

  assert.equal(iod.labConfig.getOutcome("cellulose", { reagentAdded: true, heated: false }).statusBadge, "negative");
  assert.equal(iod.labConfig.getOutcome("glucose", { reagentAdded: true, heated: false }).statusBadge, "negative");
  assert.equal(iod.labConfig.getOutcome("wasser", { reagentAdded: true, heated: false }).statusBadge, "negative");

  // Hexagon chains (<polygon>) for polysaccharides and helix state attributes
  const svgCold = iod.particleModel.renderSvg("amylose", { reagentAdded: true, heated: false, outcome: amyloseCold });
  const svgHot = iod.particleModel.renderSvg("amylose", { reagentAdded: true, heated: true, outcome: amyloseHot });
  const svgCellulose = iod.particleModel.renderSvg("cellulose", {
    reagentAdded: true,
    heated: false,
    outcome: iod.labConfig.getOutcome("cellulose", { reagentAdded: true, heated: false })
  });
  const svgGlucose = iod.particleModel.renderSvg("glucose", {
    reagentAdded: true,
    heated: false,
    outcome: iod.labConfig.getOutcome("glucose", { reagentAdded: true, heated: false })
  });
  assert.match(svgCold, /<svg[^>]*>/);
  assert.match(svgCold, /<polygon\b/);
  assert.match(svgCold, /data-helix="closed"/);
  assert.match(svgHot, /data-helix="open"/);
  assert.match(svgCellulose, /<polygon\b/);
  assert.doesNotMatch(svgCellulose, /ɔlG/);
  assert.match(svgCellulose, /data-orientation="alternating"/);
  assert.match(svgGlucose, /<polygon\b/);
});
