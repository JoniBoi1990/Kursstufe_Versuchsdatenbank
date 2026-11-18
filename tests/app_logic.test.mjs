import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadAppBundle() {
  const kh = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/data/kh_nachweise.js"), "utf8");
  const pr = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/data/proteine_nachweise.js"), "utf8");
  const app = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/app.js"), "utf8");
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(kh + "\n" + pr + "\n" + app, sandbox);
  return { db: sandbox.VERSUCHS_DATENBANK, App: sandbox.VersuchsDBApp };
}

test("filterExperiments matches category, tags, and text queries", () => {
  const { db, App } = loadAppBundle();
  assert.equal(App.filterExperiments(db.experiments, { query: "", category: "Alle" }).length, 6);
  assert.deepEqual(
    Array.from(App.filterExperiments(db.experiments, { query: "", category: "Proteine" }), (e) => e.id),
    ["ninhydrin-nachweis", "biuret-probe"]
  );
  assert.deepEqual(
    Array.from(App.filterExperiments(db.experiments, { query: "silber", category: "Alle" }), (e) => e.id),
    ["tollens-probe"]
  );
  assert.deepEqual(
    Array.from(App.filterExperiments(db.experiments, { query: "#Komplexchemie", category: "Alle" }), (e) => e.id),
    ["benedict-probe", "tollens-probe", "biuret-probe"]
  );
});

test("storage adapter degrades gracefully when localStorage throws", () => {
  const { App } = loadAppBundle();
  const brokenStorage = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); }
  };
  const safe = App.createStorageAdapter(brokenStorage);
  assert.equal(safe.get("versuchsdb_lf_open", "false"), "false");
  assert.doesNotThrow(() => safe.set("versuchsdb_lf_open", "true"));
  assert.equal(safe.get("versuchsdb_lf_open", "false"), "true");
});

test("renderVesselSvg depicts precipitates, silver mirrors, and test strips accurately", () => {
  const { db, App } = loadAppBundle();
  const benedict = db.experiments.find((e) => e.id === "benedict-probe");
  const tollens = db.experiments.find((e) => e.id === "tollens-probe");
  const god = db.experiments.find((e) => e.id === "god-test");

  const benSvg = App.renderVesselSvg(
    "test-tube",
    benedict.labConfig.getOutcome("glucose", { reagentAdded: true, heated: true }),
    { reagentAdded: true, heated: true }
  );
  const tolSvg = App.renderVesselSvg(
    "test-tube",
    tollens.labConfig.getOutcome("glucose", { reagentAdded: true, heated: true }),
    { reagentAdded: true, heated: true }
  );
  const godSvg = App.renderVesselSvg(
    "test-strip",
    god.labConfig.getOutcome("glucose", { reagentAdded: true, heated: false }),
    { reagentAdded: true, heated: false }
  );

  assert.match(benSvg, /data-precipitate="true"/);
  assert.match(benSvg, /data-heated="true"/);
  assert.match(tolSvg, /data-mirror="true"/);
  assert.match(godSvg, /data-apparatus="test-strip"/);
});

test("controller state helpers and initVersuchsDatenbank wire sample reset, LF capture sync, and learning path", () => {
  const { db, App } = loadAppBundle();
  const initial = App.createLabState(db.experiments[1]);
  assert.equal(initial.experimentId, "benedict-probe");
  assert.equal(initial.sampleId, db.experiments[1].labConfig.samples[0].id);
  assert.equal(initial.reagentAdded, false);
  assert.equal(initial.heated, false);

  const nextState = App.reduceLabState(
    { experimentId: "benedict-probe", sampleId: "glucose", reagentAdded: true, heated: true },
    { type: "select-sample", sampleId: "saccharose" }
  );
  // Review Focus #3
  assert.deepEqual(
    { ...nextState },
    {
      experimentId: "benedict-probe",
      sampleId: "saccharose",
      reagentAdded: false,
      heated: false
    }
  );

  // Review Focus #4: global LF sync state helper (must handle empty array safely)
  assert.equal(App.computeLfToggleState([]), false);
  const lfBoxes = [{ open: false }, { open: false }];
  assert.equal(App.computeLfToggleState(lfBoxes), false);
  lfBoxes[0].open = true;
  assert.equal(App.computeLfToggleState(lfBoxes), false);
  lfBoxes[1].open = true;
  assert.equal(App.computeLfToggleState(lfBoxes), true);

  // Integrated controller + capture-listener + broken-storage check (Review Focus #3, #4, #5)
  const registeredCaptureListeners = [];
  const lfDetailsMock = {
    open: false,
    matches(sel) { return sel === "details.lf-box"; }
  };
  const makeEl = () => ({
    innerHTML: "",
    textContent: "",
    value: "",
    max: 6,
    hidden: false,
    open: false,
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {},
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k] ?? null; },
    addEventListener() {},
    querySelectorAll(sel) {
      if (sel === "details.lf-box") return [lfDetailsMock];
      return [];
    },
    closest: () => null
  });
  const elements = new Map();
  const mockDoc = {
    documentElement: makeEl(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeEl());
      return elements.get(id);
    },
    querySelectorAll(sel) {
      if (sel === "details.lf-box") return [lfDetailsMock];
      return [];
    },
    addEventListener(type, fn, opts) {
      if (type === "toggle") registeredCaptureListeners.push({ fn, opts });
    }
  };
  const brokenStorage = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); }
  };

  const ctrl = App.initVersuchsDatenbank({ document: mockDoc, storage: brokenStorage, db });
  const captureToggle = registeredCaptureListeners.find((l) => l.opts?.capture === true);
  assert.ok(captureToggle, "toggle listener must use { capture: true }");

  ctrl.selectExperiment("benedict-probe");
  ctrl.addReagent();
  ctrl.toggleHeat();
  assert.equal(ctrl.getState().lab.heated, true);
  ctrl.selectSample("saccharose");
  assert.equal(ctrl.getState().lab.reagentAdded, false);
  assert.equal(ctrl.getState().lab.heated, false);

  ctrl.toggleAllLf(true);
  assert.equal(ctrl.getState().lfAllOpen, true);
  assert.equal(lfDetailsMock.open, true);
  assert.equal(mockDoc.getElementById("lf-toggle-btn").getAttribute("aria-expanded"), "true");

  // Simulate user manually closing the single LF <details> box -> capture toggle syncs button
  lfDetailsMock.open = false;
  captureToggle.fn({ target: lfDetailsMock });
  assert.equal(mockDoc.getElementById("lf-toggle-btn").getAttribute("aria-expanded"), "false");

  ctrl.setMode("path");
  assert.equal(mockDoc.getElementById("catalog-controls").hidden, true);
  assert.equal(mockDoc.getElementById("learning-path-footer").hidden, false);
  ctrl.stepLearningPath(1);
  assert.equal(ctrl.getState().lab.experimentId, "tollens-probe");

  // toggleTheme from "auto" flips away from dark when prefers-color-scheme: dark matches
  const kh = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/data/kh_nachweise.js"), "utf8");
  const pr = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/data/proteine_nachweise.js"), "utf8");
  const appCode = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/app.js"), "utf8");
  const darkSandbox = {
    window: {},
    matchMedia: (q) => ({ matches: q === "(prefers-color-scheme: dark)" })
  };
  darkSandbox.window = darkSandbox;
  darkSandbox.globalThis = darkSandbox;
  vm.runInNewContext(kh + "\n" + pr + "\n" + appCode, darkSandbox);
  const darkCtrl = darkSandbox.VersuchsDBApp.initVersuchsDatenbank({
    document: mockDoc,
    storage: brokenStorage,
    db: darkSandbox.VERSUCHS_DATENBANK
  });
  darkCtrl.toggleTheme();
  assert.equal(darkCtrl.getState().theme, "light");
});

test("in-experiment actions update controls in-place without rebuilding DOM or dropping focus/LF state", () => {
  const { db, App } = loadAppBundle();

  function makeTrackedEl(extra = {}) {
    let html = "";
    let htmlWrites = 0;
    const classes = new Set();
    const el = {
      textContent: "",
      value: "",
      max: 6,
      hidden: false,
      open: false,
      disabled: false,
      dataset: {},
      attributes: {},
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        toggle(c, force) {
          const next = force === undefined ? !classes.has(c) : Boolean(force);
          if (next) classes.add(c);
          else classes.delete(c);
        },
        contains(c) { return classes.has(c); }
      },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] ?? null; },
      addEventListener() {},
      querySelectorAll: () => [],
      querySelector: () => null,
      closest: () => null,
      get htmlWrites() { return htmlWrites; },
      ...extra
    };
    Object.defineProperty(el, "innerHTML", {
      get() { return html; },
      set(val) {
        html = String(val);
        htmlWrites += 1;
      }
    });
    return el;
  }

  const lfDetailsMock = makeTrackedEl({
    matches(sel) { return sel === "details.lf-box"; }
  });
  const sampleStubs = [
    makeTrackedEl({ attributes: { "data-sample-id": "glucose" } }),
    makeTrackedEl({ attributes: { "data-sample-id": "maltose" } })
  ];
  const heatBtnStub = makeTrackedEl();
  const svgSlotStub = makeTrackedEl();
  const expCardStubs = db.experiments.map((e) => {
    const badge = makeTrackedEl();
    return makeTrackedEl({
      attributes: { "data-exp-id": e.id },
      querySelector(sel) { return sel === ".badge-pill" ? badge : null; }
    });
  });

  const elements = new Map([
    ["lf-container", makeTrackedEl({ querySelector: () => lfDetailsMock, querySelectorAll: () => [lfDetailsMock] })],
    ["sample-buttons", makeTrackedEl({ querySelectorAll: (sel) => (sel === "[data-sample-id]" ? sampleStubs : []) })],
    ["temp-control-container", makeTrackedEl({ querySelector: (sel) => (sel === "#heat-toggle-btn" ? heatBtnStub : null) })],
    ["particle-stage", makeTrackedEl({ querySelector: (sel) => (sel === ".particle-svg-slot" ? svgSlotStub : null) })],
    ["experiment-grid", makeTrackedEl({ querySelectorAll: (sel) => (sel === "[data-exp-id]" ? expCardStubs : []) })]
  ]);

  const mockDoc = {
    documentElement: makeTrackedEl(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeTrackedEl());
      return elements.get(id);
    },
    querySelectorAll(sel) {
      if (sel === "details.lf-box") return [lfDetailsMock];
      return [];
    },
    addEventListener() {}
  };

  const ctrl = App.initVersuchsDatenbank({ document: mockDoc, storage: null, db });
  ctrl.selectExperiment("benedict-probe");

  // Simulate user manually opening the LF box while scrolled down
  lfDetailsMock.open = true;

  const writesBefore = {
    header: mockDoc.getElementById("experiment-header").htmlWrites,
    samples: mockDoc.getElementById("sample-buttons").htmlWrites,
    temp: mockDoc.getElementById("temp-control-container").htmlWrites,
    summary: mockDoc.getElementById("summary-card").htmlWrites,
    lf: mockDoc.getElementById("lf-container").htmlWrites,
    grid: mockDoc.getElementById("experiment-grid").htmlWrites
  };

  ctrl.selectSample("maltose");
  assert.equal(sampleStubs[1].classList.contains("is-active"), true);
  assert.equal(sampleStubs[0].classList.contains("is-active"), false);

  ctrl.addReagent();
  const reagentBtn = mockDoc.getElementById("reagent-btn");
  assert.equal(reagentBtn.disabled, false, "must stay focusable via aria-disabled");
  assert.equal(reagentBtn.getAttribute("aria-disabled"), "true");

  ctrl.toggleHeat();
  assert.equal(heatBtnStub.getAttribute("aria-pressed"), "true");
  assert.equal(heatBtnStub.classList.contains("is-hot"), true);

  ctrl.resetLab();
  assert.equal(reagentBtn.getAttribute("aria-disabled"), "false");
  assert.equal(heatBtnStub.getAttribute("aria-pressed"), "false");

  // No container rebuilds occurred during in-experiment interactions
  assert.equal(mockDoc.getElementById("experiment-header").htmlWrites, writesBefore.header);
  assert.equal(mockDoc.getElementById("sample-buttons").htmlWrites, writesBefore.samples);
  assert.equal(mockDoc.getElementById("temp-control-container").htmlWrites, writesBefore.temp);
  assert.equal(mockDoc.getElementById("summary-card").htmlWrites, writesBefore.summary);
  assert.equal(mockDoc.getElementById("lf-container").htmlWrites, writesBefore.lf);
  assert.equal(mockDoc.getElementById("experiment-grid").htmlWrites, writesBefore.grid);
  assert.equal(lfDetailsMock.open, true, "manual LF open state must survive in-experiment clicks");
});

test("preserveScroll restores scrollY if browser clamps scroll during DOM updates", () => {
  const kh = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/data/kh_nachweise.js"), "utf8");
  const pr = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/data/proteine_nachweise.js"), "utf8");
  const appCode = fs.readFileSync(path.resolve("Kursstufe_Versuchsdatenbank/app.js"), "utf8");
  let scrollRestoredTo = null;
  const sandbox = {
    window: {},
    scrollX: 0,
    scrollY: 380,
    scrollTo(x, y) {
      this.scrollX = x;
      this.scrollY = y;
      scrollRestoredTo = y;
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(kh + "\n" + pr + "\n" + appCode, sandbox);

  const elements = new Map();
  const makeStub = (extra = {}) => ({
    textContent: "", value: "", max: 6, hidden: false, open: false, disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {}, attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k] ?? null; },
    addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, closest: () => null,
    ...extra
  });
  const vesselStage = makeStub();
  Object.defineProperty(vesselStage, "innerHTML", {
    get() { return ""; },
    set() { sandbox.scrollY = 0; }
  });
  elements.set("vessel-stage", vesselStage);

  const mockDoc = {
    documentElement: makeStub(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeStub());
      return elements.get(id);
    },
    querySelectorAll: () => [],
    addEventListener() {}
  };

  const ctrl = sandbox.VersuchsDBApp.initVersuchsDatenbank({
    document: mockDoc,
    storage: null,
    db: sandbox.VERSUCHS_DATENBANK
  });
  sandbox.scrollY = 380;
  ctrl.selectSample("fructose");
  assert.equal(scrollRestoredTo, 380);
  assert.equal(sandbox.scrollY, 380);
});
