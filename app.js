(function (root) {
  "use strict";

  const STORAGE_KEYS = {
    lfOpen: "versuchsdb_lf_open",
    theme: "versuchsdb_theme",
    done: "versuchsdb_done"
  };

  function createStorageAdapter(storageImpl) {
    const memory = new Map();
    return {
      get(key, fallback) {
        if (storageImpl && typeof storageImpl.getItem === "function") {
          try {
            const val = storageImpl.getItem(key);
            if (val !== null && val !== undefined) {
              return val;
            }
          } catch {
            // Fall through to memory fallback
          }
        }
        return memory.has(key) ? memory.get(key) : fallback;
      },
      set(key, value) {
        const strVal = String(value);
        memory.set(key, strVal);
        if (storageImpl && typeof storageImpl.setItem === "function") {
          try {
            storageImpl.setItem(key, strVal);
          } catch {
            // Ignore storage restrictions (e.g., private mode file://)
          }
        }
      }
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function filterExperiments(experiments, { query = "", category = "Alle" } = {}) {
    const q = String(query).trim().toLowerCase();
    return (experiments || []).filter((exp) => {
      const catMatch =
        !category ||
        category === "Alle" ||
        exp.category === category ||
        (Array.isArray(exp.tags) && exp.tags.includes(category));
      if (!catMatch) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [
        exp.title,
        exp.subtitle,
        exp.category,
        exp.summaryCard && exp.summaryCard.target,
        exp.summaryCard && exp.summaryCard.reagent,
        ...(exp.tags || [])
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function createLabState(experiment) {
    const firstSample =
      experiment && experiment.labConfig && experiment.labConfig.samples && experiment.labConfig.samples[0];
    return {
      experimentId: experiment ? experiment.id : "",
      sampleId: firstSample ? firstSample.id : "",
      reagentAdded: false,
      heated: false
    };
  }

  function reduceLabState(state, action) {
    if (!action) return state;
    switch (action.type) {
      case "select-sample":
        return {
          ...state,
          sampleId: action.sampleId,
          reagentAdded: false,
          heated: false
        };
      case "add-reagent":
        return {
          ...state,
          reagentAdded: true
        };
      case "toggle-heat":
        return {
          ...state,
          heated: typeof action.heated === "boolean" ? action.heated : !state.heated
        };
      case "reset":
        return {
          ...state,
          reagentAdded: false,
          heated: false
        };
      default:
        return state;
    }
  }

  function computeLfToggleState(detailsElements) {
    if (!detailsElements || detailsElements.length === 0) {
      return false;
    }
    return Array.from(detailsElements).every((el) => Boolean(el && el.open));
  }

  function renderVesselSvg(apparatus, outcome, state) {
    const safeOutcome = outcome || {};
    const safeState = state || {};
    const heated = Boolean(safeState.heated);
    const reagentAdded = Boolean(safeState.reagentAdded);

    if (apparatus === "test-strip") {
      const padColor = safeOutcome.stripPadColor || "#f3e38d";
      const liqColor = safeOutcome.liquidColor || "#e6f4fb";
      const stripTransform = reagentAdded
        ? "translate(122, 62) rotate(14)"
        : "translate(148, 20) rotate(14)";
      return `<svg viewBox="0 0 260 220" class="vessel-svg" data-apparatus="test-strip" data-heated="${heated}" role="img" aria-label="GOD-Teststreifen und Probengefäß">
        <defs>
          <linearGradient id="glass-beaker" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.45"/>
          </linearGradient>
        </defs>
        <path d="M72,118 V184 Q72,196 86,196 H174 Q188,196 188,184 V118" fill="none" stroke="#64748b" stroke-width="3"/>
        <path d="M75,144 H185 V183 Q185,193 173,193 H87 Q75,193 75,183 Z" fill="${liqColor}" fill-opacity="0.55"/>
        <ellipse cx="130" cy="144" rx="55" ry="6" fill="${liqColor}" fill-opacity="0.75" stroke="#94a3b8" stroke-width="1"/>
        <g transform="${stripTransform}">
          <rect x="0" y="0" width="18" height="98" rx="3" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
          <rect x="2" y="72" width="14" height="20" rx="2" fill="${padColor}" stroke="#475569" stroke-width="1"/>
        </g>
        <path d="M75,118 H185 V183 Q185,193 173,193 H87 Q75,193 75,183 Z" fill="url(#glass-beaker)" pointer-events="none"/>
      </svg>`;
    }

    const liqColor = safeOutcome.liquidColor || "#e6f4fb";
    const liqOpacity = typeof safeOutcome.opacity === "number" ? safeOutcome.opacity : 0.45;
    const hasPrecipitate = Boolean(safeOutcome.precipitateColor);
    const hasMirror = Boolean(safeOutcome.mirrorEffect);

    const mirrorLayer = hasMirror
      ? `<path d="M98,94 V166 Q98,192 130,192 Q162,192 162,166 V94" fill="none" stroke="url(#silver-mirror)" stroke-width="8" stroke-linecap="round"/>`
      : "";

    const precipitateLayer = hasPrecipitate
      ? `<g>
           <path d="M99,169 Q130,178 161,169 L160,174 Q130,193 100,174 Z" fill="${safeOutcome.precipitateColor}"/>
           <circle cx="116" cy="175" r="3" fill="#9a2e14"/>
           <circle cx="132" cy="180" r="3.5" fill="#9a2e14"/>
           <circle cx="145" cy="174" r="2.8" fill="#9a2e14"/>
         </g>`
      : "";

    const heatLayer = heated
      ? `<g class="heat-waves">
           <rect x="68" y="128" width="124" height="78" rx="10" fill="#fbbf24" fill-opacity="0.16" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4 3"/>
           <path d="M92,62 Q86,52 92,42" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
           <path d="M130,54 Q124,44 130,34" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
           <path d="M168,62 Q162,52 168,42" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
           <text x="130" y="216" text-anchor="middle" font-size="11" font-weight="700" fill="#b45309">Wasserbad 80 °C</text>
         </g>`
      : `<text x="130" y="216" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">Raumtemperatur 20 °C</text>`;

    return `<svg viewBox="0 0 260 225" class="vessel-svg" data-apparatus="test-tube" data-precipitate="${hasPrecipitate}" data-mirror="${hasMirror}" data-heated="${heated}" role="img" aria-label="Reagenzglas-Versuchsstand">
      <defs>
        <linearGradient id="silver-mirror" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="35%" stop-color="#94a3b8"/>
          <stop offset="65%" stop-color="#e2e8f0"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
        <linearGradient id="tube-shine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
          <stop offset="30%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="85%" stop-color="#ffffff" stop-opacity="0.25"/>
        </linearGradient>
      </defs>
      ${heatLayer}
      <path d="M96,98 V166 Q96,194 130,194 Q164,194 164,166 V98 Z" fill="${liqColor}" fill-opacity="${liqOpacity}"/>
      <ellipse cx="130" cy="98" rx="34" ry="5" fill="${liqColor}" fill-opacity="${Math.min(1, liqOpacity + 0.15)}"/>
      ${precipitateLayer}
      ${mirrorLayer}
      <path d="M95,28 V166 Q95,195 130,195 Q165,195 165,166 V28" fill="url(#tube-shine)" stroke="#64748b" stroke-width="3"/>
      <ellipse cx="130" cy="28" rx="37" ry="6" fill="none" stroke="#64748b" stroke-width="3"/>
    </svg>`;
  }

  function initVersuchsDatenbank({ document: doc, storage, db } = {}) {
    const targetDoc = doc || (typeof document !== "undefined" ? document : null);
    const database = db || root.VERSUCHS_DATENBANK;
    if (!targetDoc || !database || !Array.isArray(database.experiments) || database.experiments.length === 0) {
      return null;
    }

    const store = createStorageAdapter(
      storage !== undefined ? storage : typeof localStorage !== "undefined" ? localStorage : null
    );
    const orderedExperiments = [...database.experiments].sort(
      (a, b) => (a.learningPathOrder || 99) - (b.learningPathOrder || 99)
    );
    const learningPathIds =
      database.learningPaths && database.learningPaths[0] && Array.isArray(database.learningPaths[0].experimentIds)
        ? database.learningPaths[0].experimentIds.filter((id) => orderedExperiments.some((e) => e.id === id))
        : orderedExperiments.map((e) => e.id);

    let doneSet;
    try {
      const parsed = JSON.parse(store.get(STORAGE_KEYS.done, "[]"));
      doneSet = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      doneSet = new Set();
    }

    const state = {
      mode: "catalog", // "catalog" | "path"
      query: "",
      category: "Alle",
      lfAllOpen: store.get(STORAGE_KEYS.lfOpen, "false") === "true",
      theme: store.get(STORAGE_KEYS.theme, "auto"),
      lab: createLabState(orderedExperiments[0]),
      doneIds: doneSet
    };

    const el = {
      modeCatalogBtn: targetDoc.getElementById("mode-catalog-btn"),
      modePathBtn: targetDoc.getElementById("mode-path-btn"),
      lfToggleBtn: targetDoc.getElementById("lf-toggle-btn"),
      themeToggleBtn: targetDoc.getElementById("theme-toggle-btn"),
      catalogControls: targetDoc.getElementById("catalog-controls"),
      searchInput: targetDoc.getElementById("search-input"),
      categoryChips: targetDoc.getElementById("category-chips"),
      experimentGrid: targetDoc.getElementById("experiment-grid"),
      experimentHeader: targetDoc.getElementById("experiment-header"),
      sampleButtons: targetDoc.getElementById("sample-buttons"),
      reagentBtn: targetDoc.getElementById("reagent-btn"),
      resetBtn: targetDoc.getElementById("reset-btn"),
      tempContainer: targetDoc.getElementById("temp-control-container"),
      vesselStage: targetDoc.getElementById("vessel-stage"),
      labObservation: targetDoc.getElementById("lab-observation"),
      summaryCard: targetDoc.getElementById("summary-card"),
      particleStage: targetDoc.getElementById("particle-stage"),
      lfContainer: targetDoc.getElementById("lf-container"),
      pathFooter: targetDoc.getElementById("learning-path-footer"),
      pathProgressText: targetDoc.getElementById("path-progress-text"),
      pathProgressBar: targetDoc.getElementById("path-progress-bar"),
      markDoneBtn: targetDoc.getElementById("mark-done-btn"),
      prevExpBtn: targetDoc.getElementById("prev-exp-btn"),
      nextExpBtn: targetDoc.getElementById("next-exp-btn")
    };

    function getCurrentExperiment() {
      return orderedExperiments.find((e) => e.id === state.lab.experimentId) || orderedExperiments[0];
    }

    function applyTheme() {
      const htmlEl = targetDoc.documentElement;
      if (!htmlEl || !htmlEl.setAttribute) return;
      if (state.theme === "light" || state.theme === "dark") {
        htmlEl.setAttribute("data-theme", state.theme);
      } else if (htmlEl.removeAttribute) {
        htmlEl.removeAttribute("data-theme");
      }
      if (el.themeToggleBtn) {
        const label = state.theme === "dark" ? "☀️ Hell" : state.theme === "light" ? "🌙 Dunkel" : "🌗 Design";
        el.themeToggleBtn.textContent = label;
      }
    }

    function syncLfButtonFromDom(forcedOpen) {
      if (!el.lfToggleBtn) return;
      const detailsNodes = targetDoc.querySelectorAll ? targetDoc.querySelectorAll("details.lf-box") : [];
      const isOpen = typeof forcedOpen === "boolean" ? forcedOpen : computeLfToggleState(detailsNodes);
      el.lfToggleBtn.setAttribute("aria-expanded", String(isOpen));
      el.lfToggleBtn.textContent = isOpen
        ? "LF-Vertiefungen: Alle offen (LF)"
        : "LF-Vertiefungen: Eingeklappt (BF)";
    }

    let lastChipKey = null;

    function renderChips() {
      if (!el.categoryChips) return;
      const tags = [];
      orderedExperiments.forEach((exp) => {
        (exp.tags || []).forEach((tag) => {
          if (!tags.includes(tag)) tags.push(tag);
        });
      });
      const chipNames = ["Alle", ...(database.categories || []), ...tags.filter((t) => t !== "#Nachweis")];
      const chipKey = chipNames.join("|");
      const existingChips =
        chipKey === lastChipKey && typeof el.categoryChips.querySelectorAll === "function"
          ? el.categoryChips.querySelectorAll("[data-category]")
          : [];
      if (existingChips.length === chipNames.length) {
        Array.from(existingChips).forEach((btn) => {
          const active = btn.getAttribute("data-category") === state.category;
          if (btn.classList && typeof btn.classList.toggle === "function") {
            btn.classList.toggle("is-active", active);
          }
          if (typeof btn.setAttribute === "function") {
            btn.setAttribute("aria-pressed", String(active));
          }
        });
        return;
      }

      lastChipKey = chipKey;
      el.categoryChips.innerHTML = chipNames
        .map(
          (chip) =>
            `<button type="button" class="chip-btn${state.category === chip ? " is-active" : ""}" data-category="${escapeHtml(chip)}" aria-pressed="${state.category === chip}">${escapeHtml(chip)}</button>`
        )
        .join("");
    }

    let lastCatalogIds = null;

    function preserveScroll(fn) {
      const canRestore =
        typeof root.scrollY === "number" &&
        typeof root.scrollTo === "function";
      const x = canRestore ? root.scrollX || 0 : 0;
      const y = canRestore ? root.scrollY : 0;
      fn();
      if (canRestore && root.scrollY !== y) {
        root.scrollTo(x, y);
      }
    }

    function renderCatalog() {
      if (!el.experimentGrid) return;
      const filtered = filterExperiments(orderedExperiments, { query: state.query, category: state.category });
      if (filtered.length === 0) {
        lastCatalogIds = "";
        el.experimentGrid.innerHTML = `<p class="subtitle">Keine passenden Versuche gefunden.</p>`;
        return;
      }
      const idsKey = filtered.map((e) => e.id).join(",");
      const existingCards =
        idsKey === lastCatalogIds && typeof el.experimentGrid.querySelectorAll === "function"
          ? el.experimentGrid.querySelectorAll("[data-exp-id]")
          : [];
      if (existingCards.length === filtered.length) {
        Array.from(existingCards).forEach((card, i) => {
          const exp = filtered[i];
          const selected = exp.id === state.lab.experimentId;
          const done = state.doneIds.has(exp.id);
          if (card.classList && typeof card.classList.toggle === "function") {
            card.classList.toggle("is-selected", selected);
          }
          const badge = typeof card.querySelector === "function" ? card.querySelector(".badge-pill") : null;
          if (badge) {
            if (badge.classList && typeof badge.classList.toggle === "function") {
              badge.classList.toggle("is-done", done);
            }
            badge.textContent = done ? "✓ Erprobt" : exp.level;
          }
        });
        return;
      }

      lastCatalogIds = idsKey;
      el.experimentGrid.innerHTML = filtered
        .map((exp) => {
          const selected = exp.id === state.lab.experimentId;
          const done = state.doneIds.has(exp.id);
          return `<button type="button" role="listitem" class="exp-card${selected ? " is-selected" : ""}" data-exp-id="${escapeHtml(exp.id)}">
            <div class="exp-card-top">
              <span class="exp-card-title">${escapeHtml(exp.title)}</span>
              <span class="badge-pill${done ? " is-done" : ""}">${done ? "✓ Erprobt" : escapeHtml(exp.level)}</span>
            </div>
            <span class="exp-card-sub">${escapeHtml(exp.subtitle)}</span>
          </button>`;
        })
        .join("");
    }

    function renderExperimentStructure(exp) {
      if (el.experimentHeader) {
        el.experimentHeader.innerHTML = `<h2 id="experiment-title">${escapeHtml(exp.title)}</h2>
          <p class="subtitle">${escapeHtml(exp.subtitle)}</p>
          <div class="exp-meta-row">
            <span class="badge-pill">${escapeHtml(exp.category)}</span>
            ${(exp.tags || []).map((t) => `<span class="badge-pill">${escapeHtml(t)}</span>`).join("")}
          </div>`;
      }

      if (el.sampleButtons) {
        el.sampleButtons.innerHTML = exp.labConfig.samples
          .map((s) => {
            const active = state.lab.sampleId === s.id;
            return `<button type="button" class="sample-btn${active ? " is-active" : ""}" data-sample-id="${escapeHtml(s.id)}" aria-pressed="${active}">
                <span>${escapeHtml(s.label)}</span>
                <small>${escapeHtml(s.formulaHint)}</small>
              </button>`;
          })
          .join("");
      }

      if (el.tempContainer) {
        if (exp.labConfig.supportsHeating) {
          el.tempContainer.innerHTML = `<button type="button" id="heat-toggle-btn" class="heat-btn${state.lab.heated ? " is-hot" : ""}" aria-pressed="${state.lab.heated}">
            ${state.lab.heated ? "🔥 Wasserbad aktiv (80 °C) → Abkühlen auf 20 °C" : "🌡️ Raumtemperatur (20 °C) → Wasserbad 80 °C"}
          </button>`;
        } else {
          el.tempContainer.innerHTML = `<span class="temp-badge">🌡️ 20 °C (Raumtemperatur ausreichend)</span>`;
        }
      }

      if (el.summaryCard) {
        el.summaryCard.innerHTML = `
          <div class="summary-row"><span class="summary-key">Nachgewiesen:</span><span>${escapeHtml(exp.summaryCard.target)}</span></div>
          <div class="summary-row"><span class="summary-key">Reagenz:</span><span>${escapeHtml(exp.summaryCard.reagent)}</span></div>
          <div class="summary-row"><span class="summary-key">Signal (+):</span><span>${escapeHtml(exp.summaryCard.positiveSignal)}</span></div>`;
      }

      if (el.particleStage) {
        const legendHtml = (exp.particleModel.legend || [])
          .map(
            (item) =>
              `<span class="legend-item"><span class="legend-dot" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(item.label)}</span>`
          )
          .join("");
        el.particleStage.innerHTML = `<h3>${escapeHtml(exp.particleModel.title)}</h3>
          <div class="particle-svg-slot"></div>
          <div class="legend-row">${legendHtml}</div>`;
      }

      if (el.lfContainer) {
        const blocksHtml = (exp.lfSection.blocks || [])
          .map((b) => `<div class="lf-block"><h4>${escapeHtml(b.heading)}</h4>${b.html}</div>`)
          .join("");
        el.lfContainer.innerHTML = `<details class="lf-box"${state.lfAllOpen ? " open" : ""}>
          <summary><span class="lf-badge">LF</span> ${escapeHtml(exp.lfSection.title)}</summary>
          <div class="lf-content">${blocksHtml}</div>
        </details>`;
      }

      syncLfButtonFromDom(state.lfAllOpen);
      updateExperimentState();
    }

    function updateExperimentState() {
      const exp = getCurrentExperiment();
      const outcome = exp.labConfig.getOutcome(state.lab.sampleId, {
        reagentAdded: state.lab.reagentAdded,
        heated: state.lab.heated
      });

      preserveScroll(() => {
        if (el.sampleButtons && typeof el.sampleButtons.querySelectorAll === "function") {
          Array.from(el.sampleButtons.querySelectorAll("[data-sample-id]")).forEach((btn) => {
            const active = btn.getAttribute("data-sample-id") === state.lab.sampleId;
            if (btn.classList && typeof btn.classList.toggle === "function") {
              btn.classList.toggle("is-active", active);
            }
            if (typeof btn.setAttribute === "function") {
              btn.setAttribute("aria-pressed", String(active));
            }
          });
        }

        if (el.reagentBtn) {
          el.reagentBtn.textContent = state.lab.reagentAdded
            ? `✓ ${exp.labConfig.reagentLabel} zugegeben`
            : exp.labConfig.reagentActionLabel;
          if (el.reagentBtn.classList && typeof el.reagentBtn.classList.toggle === "function") {
            el.reagentBtn.classList.toggle("is-added", state.lab.reagentAdded);
          }
          if (typeof el.reagentBtn.setAttribute === "function") {
            el.reagentBtn.setAttribute("aria-disabled", String(state.lab.reagentAdded));
          }
        }

        if (el.tempContainer && exp.labConfig.supportsHeating) {
          const heatBtn =
            typeof el.tempContainer.querySelector === "function"
              ? el.tempContainer.querySelector("#heat-toggle-btn")
              : null;
          if (heatBtn) {
            if (heatBtn.classList && typeof heatBtn.classList.toggle === "function") {
              heatBtn.classList.toggle("is-hot", state.lab.heated);
            }
            if (typeof heatBtn.setAttribute === "function") {
              heatBtn.setAttribute("aria-pressed", String(state.lab.heated));
            }
            heatBtn.textContent = state.lab.heated
              ? "🔥 Wasserbad aktiv (80 °C) → Abkühlen auf 20 °C"
              : "🌡️ Raumtemperatur (20 °C) → Wasserbad 80 °C";
          }
        }

        if (el.vesselStage) {
          el.vesselStage.innerHTML = renderVesselSvg(exp.labConfig.apparatus, outcome, state.lab);
        }

        if (el.labObservation) {
          el.labObservation.textContent = outcome.observationShort;
          el.labObservation.setAttribute("data-status", outcome.statusBadge);
        }

        if (el.particleStage) {
          const svgMarkup = exp.particleModel.renderSvg(state.lab.sampleId, { ...state.lab, outcome });
          const slot =
            typeof el.particleStage.querySelector === "function"
              ? el.particleStage.querySelector(".particle-svg-slot")
              : null;
          if (slot) {
            slot.innerHTML = svgMarkup;
          } else {
            const legendHtml = (exp.particleModel.legend || [])
              .map(
                (item) =>
                  `<span class="legend-item"><span class="legend-dot" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(item.label)}</span>`
              )
              .join("");
            el.particleStage.innerHTML = `<h3>${escapeHtml(exp.particleModel.title)}</h3>
              <div class="particle-svg-slot">${svgMarkup}</div>
              <div class="legend-row">${legendHtml}</div>`;
          }
        }
      });
    }

    function renderModeAndPath() {
      const isPath = state.mode === "path";
      if (el.catalogControls) el.catalogControls.hidden = isPath;
      if (el.pathFooter) el.pathFooter.hidden = !isPath;
      if (el.modeCatalogBtn) {
        el.modeCatalogBtn.classList.toggle("is-active", !isPath);
        el.modeCatalogBtn.setAttribute("aria-pressed", String(!isPath));
      }
      if (el.modePathBtn) {
        el.modePathBtn.classList.toggle("is-active", isPath);
        el.modePathBtn.setAttribute("aria-pressed", String(isPath));
      }

      const idx = Math.max(0, learningPathIds.indexOf(state.lab.experimentId));
      const total = learningPathIds.length;
      if (el.pathProgressText) {
        el.pathProgressText.textContent = `Versuch ${idx + 1} von ${total} (${state.doneIds.size}/${total} erprobt)`;
      }
      if (el.pathProgressBar) {
        el.pathProgressBar.max = total;
        el.pathProgressBar.value = idx + 1;
      }
      if (el.prevExpBtn && typeof el.prevExpBtn.setAttribute === "function") {
        el.prevExpBtn.setAttribute("aria-disabled", String(idx <= 0));
      }
      if (el.nextExpBtn && typeof el.nextExpBtn.setAttribute === "function") {
        el.nextExpBtn.setAttribute("aria-disabled", String(idx >= total - 1));
      }
      if (el.markDoneBtn) {
        const isDone = state.doneIds.has(state.lab.experimentId);
        el.markDoneBtn.textContent = isDone ? "✓ Erprobt" : "Als erprobt markieren";
      }
    }

    function renderAll() {
      applyTheme();
      renderChips();
      renderCatalog();
      renderExperimentStructure(getCurrentExperiment());
      renderModeAndPath();
    }

    function saveDoneIds() {
      store.set(STORAGE_KEYS.done, JSON.stringify(Array.from(state.doneIds)));
    }

    const controller = {
      getState() {
        return {
          ...state,
          lab: { ...state.lab },
          doneIds: Array.from(state.doneIds)
        };
      },
      selectExperiment(experimentId) {
        const target = orderedExperiments.find((e) => e.id === experimentId);
        if (!target) return;
        state.lab = createLabState(target);
        preserveScroll(() => {
          renderCatalog();
          renderExperimentStructure(target);
          renderModeAndPath();
        });
      },
      selectSample(sampleId) {
        state.lab = reduceLabState(state.lab, { type: "select-sample", sampleId });
        updateExperimentState();
      },
      addReagent() {
        if (state.lab.reagentAdded) return;
        state.lab = reduceLabState(state.lab, { type: "add-reagent" });
        state.doneIds.add(state.lab.experimentId);
        saveDoneIds();
        preserveScroll(() => {
          renderCatalog();
          updateExperimentState();
          renderModeAndPath();
        });
      },
      toggleHeat() {
        state.lab = reduceLabState(state.lab, { type: "toggle-heat" });
        updateExperimentState();
      },
      resetLab() {
        state.lab = reduceLabState(state.lab, { type: "reset" });
        updateExperimentState();
      },
      toggleAllLf(forcedState) {
        state.lfAllOpen = typeof forcedState === "boolean" ? forcedState : !state.lfAllOpen;
        store.set(STORAGE_KEYS.lfOpen, String(state.lfAllOpen));
        const detailsNodes = targetDoc.querySelectorAll ? targetDoc.querySelectorAll("details.lf-box") : [];
        Array.from(detailsNodes).forEach((node) => {
          node.open = state.lfAllOpen;
        });
        syncLfButtonFromDom(state.lfAllOpen);
      },
      setMode(mode) {
        state.mode = mode === "path" ? "path" : "catalog";
        renderModeAndPath();
      },
      stepLearningPath(delta) {
        const idx = Math.max(0, learningPathIds.indexOf(state.lab.experimentId));
        const nextIdx = Math.max(0, Math.min(learningPathIds.length - 1, idx + delta));
        if (nextIdx === idx) return;
        controller.selectExperiment(learningPathIds[nextIdx]);
      },
      toggleCompleted() {
        if (state.doneIds.has(state.lab.experimentId)) {
          state.doneIds.delete(state.lab.experimentId);
        } else {
          state.doneIds.add(state.lab.experimentId);
        }
        saveDoneIds();
        renderCatalog();
        renderModeAndPath();
      },
      toggleTheme() {
        const prefersDark =
          typeof root.matchMedia === "function" && root.matchMedia("(prefers-color-scheme: dark)").matches;
        const currentlyDark = state.theme === "dark" || (state.theme === "auto" && prefersDark);
        state.theme = currentlyDark ? "light" : "dark";
        store.set(STORAGE_KEYS.theme, state.theme);
        applyTheme();
      }
    };

    // DOM Event Wiring
    if (el.modeCatalogBtn) el.modeCatalogBtn.addEventListener("click", () => controller.setMode("catalog"));
    if (el.modePathBtn) el.modePathBtn.addEventListener("click", () => controller.setMode("path"));
    if (el.lfToggleBtn) el.lfToggleBtn.addEventListener("click", () => controller.toggleAllLf());
    if (el.themeToggleBtn) el.themeToggleBtn.addEventListener("click", () => controller.toggleTheme());
    if (el.reagentBtn) el.reagentBtn.addEventListener("click", () => controller.addReagent());
    if (el.resetBtn) el.resetBtn.addEventListener("click", () => controller.resetLab());
    if (el.markDoneBtn) el.markDoneBtn.addEventListener("click", () => controller.toggleCompleted());
    if (el.prevExpBtn) el.prevExpBtn.addEventListener("click", () => controller.stepLearningPath(-1));
    if (el.nextExpBtn) el.nextExpBtn.addEventListener("click", () => controller.stepLearningPath(1));

    if (el.searchInput) {
      el.searchInput.addEventListener("input", (event) => {
        state.query = event.target.value;
        renderCatalog();
      });
    }

    if (el.categoryChips) {
      el.categoryChips.addEventListener("click", (event) => {
        const btn = event.target.closest && event.target.closest("[data-category]");
        if (!btn) return;
        state.category = btn.getAttribute("data-category");
        renderChips();
        renderCatalog();
      });
    }

    if (el.experimentGrid) {
      el.experimentGrid.addEventListener("click", (event) => {
        const card = event.target.closest && event.target.closest("[data-exp-id]");
        if (!card) return;
        controller.selectExperiment(card.getAttribute("data-exp-id"));
      });
    }

    if (el.sampleButtons) {
      el.sampleButtons.addEventListener("click", (event) => {
        const btn = event.target.closest && event.target.closest("[data-sample-id]");
        if (!btn) return;
        controller.selectSample(btn.getAttribute("data-sample-id"));
      });
    }

    if (el.tempContainer) {
      el.tempContainer.addEventListener("click", (event) => {
        const btn = event.target.closest && event.target.closest("#heat-toggle-btn");
        if (!btn) return;
        controller.toggleHeat();
      });
    }

    // Native <details> toggle does not bubble, so capture at document level (modern-web-guidance: accordion)
    if (targetDoc.addEventListener) {
      targetDoc.addEventListener(
        "toggle",
        (event) => {
          if (!event.target || !event.target.matches || !event.target.matches("details.lf-box")) {
            return;
          }
          syncLfButtonFromDom();
        },
        { capture: true }
      );
    }

    renderAll();
    return controller;
  }

  root.VersuchsDBApp = {
    createStorageAdapter,
    filterExperiments,
    createLabState,
    reduceLabState,
    computeLfToggleState,
    renderVesselSvg,
    initVersuchsDatenbank
  };

  if (typeof document !== "undefined" && document.addEventListener) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initVersuchsDatenbank());
    } else {
      initVersuchsDatenbank();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
