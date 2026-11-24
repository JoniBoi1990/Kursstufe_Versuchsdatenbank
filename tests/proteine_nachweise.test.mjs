import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadProteinModule() {
  const filePath = path.resolve("Kursstufe_Versuchsdatenbank/data/proteine_nachweise.js");
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.VERSUCHS_DATENBANK;
}

test("registers Ninhydrin and Biuret under Proteine", () => {
  const db = loadProteinModule();
  assert.deepEqual(
    Array.from(db.experiments, (e) => e.id),
    ["ninhydrin-nachweis", "biuret-probe"]
  );
  assert.ok(db.experiments.every((e) => e.category === "Proteine"));
});

test("Ninhydrin detects only free α-amino acids (Glycin) and stays negative for Dipeptid, Protein, and Wasser", () => {
  const db = loadProteinModule();
  const nin = db.experiments.find((e) => e.id === "ninhydrin-nachweis");
  assert.equal(nin.labConfig.supportsHeating, true);
  assert.equal(nin.labConfig.getOutcome("glycin", { reagentAdded: false, heated: true }).statusBadge, "pending-reagent");

  assert.equal(nin.labConfig.getOutcome("glycin", { reagentAdded: true, heated: false }).statusBadge, "pending-heat");
  const hotGly = nin.labConfig.getOutcome("glycin", { reagentAdded: true, heated: true });
  assert.equal(hotGly.statusBadge, "positive");
  assert.equal(hotGly.liquidColor, "#4a247a");

  for (const neg of ["dipeptid", "protein", "wasser"]) {
    assert.equal(nin.labConfig.getOutcome(neg, { reagentAdded: true, heated: false }).statusBadge, "pending-heat");
    const hotNeg = nin.labConfig.getOutcome(neg, { reagentAdded: true, heated: true });
    assert.equal(hotNeg.statusBadge, "negative");
  }

  assert.match(nin.lfSection.blocks.map((b) => b.html).join(" "), /Ruhemanns Purpur/i);
  assert.match(nin.lfSection.blocks.map((b) => b.html).join(" "), /CO<sub>2<\/sub>/i);
  assert.match(nin.lfSection.blocks.map((b) => b.html).join(" "), /Decarboxylierung/i);
  assert.match(nin.particleModel.renderSvg("glycin", { reagentAdded: true, heated: true, outcome: hotGly }), /<svg[^>]*>/);
  const dipeptidSvg = nin.particleModel.renderSvg("dipeptid", {
    reagentAdded: true,
    heated: true,
    outcome: nin.labConfig.getOutcome("dipeptid", { reagentAdded: true, heated: true })
  });
  assert.match(dipeptidSvg, /<svg[^>]*>/);
  assert.match(dipeptidSvg, /blockiert/i);
  assert.match(dipeptidSvg, /kein Ruhemanns Purpur/i);
  assert.match(nin.particleModel.renderSvg("protein", { reagentAdded: true, heated: true, outcome: nin.labConfig.getOutcome("protein", { reagentAdded: true, heated: true }) }), /<svg[^>]*>/);
});

test("Biuret distinguishes Tripeptid/Protein (>=2 peptide bonds) from Dipeptid and Glycin", () => {
  const db = loadProteinModule();
  const biu = db.experiments.find((e) => e.id === "biuret-probe");
  assert.equal(biu.labConfig.supportsHeating, false);

  for (const pos of ["protein", "tripeptid"]) {
    const out = biu.labConfig.getOutcome(pos, { reagentAdded: true, heated: false });
    assert.equal(out.statusBadge, "positive");
    assert.equal(out.liquidColor, "#7c2d6e");
  }
  for (const neg of ["dipeptid", "glycin", "wasser"]) {
    const out = biu.labConfig.getOutcome(neg, { reagentAdded: true, heated: false });
    assert.equal(out.statusBadge, "negative");
    assert.equal(out.liquidColor, "#9ecff5");
  }

  const lfHtml = biu.lfSection.blocks.map((b) => b.html).join(" ");
  assert.match(lfHtml, /Elektronenpaardonator/i);
  assert.match(lfHtml, /Elektronenpaarakzeptor/i);
  assert.match(lfHtml, /Chelatkomplex/i);
  assert.match(lfHtml, /<svg[^>]*>/);
  assert.match(
    biu.particleModel.renderSvg("tripeptid", {
      reagentAdded: true,
      heated: false,
      outcome: biu.labConfig.getOutcome("tripeptid", { reagentAdded: true, heated: false })
    }),
    /<svg[^>]*>/
  );
});
