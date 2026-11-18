(function (root) {
  "use strict";

  function ensureDatabase(target) {
    const db = (target.VERSUCHS_DATENBANK = target.VERSUCHS_DATENBANK || {
      categories: [],
      learningPaths: [],
      experiments: []
    });
    if (!db.categories.includes("Kohlenhydrate")) {
      db.categories.push("Kohlenhydrate");
    }
    if (!db.categories.includes("Proteine")) {
      db.categories.push("Proteine");
    }
    if (!db.learningPaths.some((p) => p.id === "naturstoffe-nachweise")) {
      db.learningPaths.push({
        id: "naturstoffe-nachweise",
        title: "Nachweisreaktionen: Kohlenhydrate & Proteine",
        experimentIds: [
          "god-test",
          "benedict-probe",
          "tollens-probe",
          "iod-probe",
          "ninhydrin-nachweis",
          "biuret-probe"
        ]
      });
    }
    return db;
  }

  function registerExperiment(db, experiment) {
    const idx = db.experiments.findIndex((item) => item.id === experiment.id);
    if (idx >= 0) {
      db.experiments[idx] = experiment;
    } else {
      db.experiments.push(experiment);
    }
  }

  function makeOutcome(overrides) {
    return Object.assign(
      {
        statusBadge: "idle",
        liquidColor: "#e6f4fb",
        opacity: 0.35,
        precipitateColor: null,
        mirrorEffect: false,
        stripPadColor: null,
        observationShort: "",
        particleModelKey: "idle"
      },
      overrides
    );
  }

  function hexPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = (cx + r * Math.cos(angle)).toFixed(1);
      const y = (cy + r * Math.sin(angle)).toFixed(1);
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }

  function drawHexagon(cx, cy, r, opts) {
    const fill = (opts && opts.fill) || "#dbeafe";
    const stroke = (opts && opts.stroke) || "#1d4ed8";
    const label = (opts && opts.label) || "";
    const textFill = (opts && opts.textFill) || "#0f172a";
    return `<g>
      <polygon points="${hexPoints(cx, cy, r)}" fill="${fill}" stroke="${stroke}" stroke-width="2" />
      ${label ? `<text x="${cx}" y="${cy + 3.5}" text-anchor="middle" font-size="9" font-weight="700" fill="${textFill}">${label}</text>` : ""}
    </g>`;
  }

  function hexChainSvg(sampleId, state) {
    const reagentAdded = Boolean(state && state.reagentAdded);
    const heated = Boolean(state && state.heated);

    if (sampleId === "amylose") {
      const helixState = reagentAdded && heated ? "open" : "closed";
      if (helixState === "open") {
        // Thermisch entwundene Sechseck-Kette (80 °C): Polyiodid entweicht
        const hexes = [0, 1, 2, 3, 4, 5, 6]
          .map((i) => {
            const x = 42 + i * 44;
            const y = 78 + (i % 2 === 0 ? -12 : 12);
            return (i > 0
              ? `<line x1="${x - 24}" y1="${78 + ((i - 1) % 2 === 0 ? -12 : 12)}" x2="${x - 16}" y2="${y}" stroke="#2563eb" stroke-width="2.5"/>`
              : "") + drawHexagon(x, y, 16, { fill: "#eff6ff", stroke: "#2563eb", label: "Glc" });
          })
          .join("");
        return `<svg viewBox="0 0 360 175" class="particle-svg" data-helix="open" role="img" aria-label="Thermisch entwundene Amylose-Sechseck-Kette bei 80 Grad Celsius">
          <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
          <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Amylose bei 80 °C: Helix geweitet (H-Brücken gelöst)</text>
          ${hexes}
          <g transform="translate(80,130)">
            <circle cx="0" cy="0" r="6" fill="#b45309"/><circle cx="14" cy="0" r="6" fill="#d97706"/><circle cx="28" cy="0" r="6" fill="#b45309"/>
            <text x="44" y="4" font-size="11" font-weight="600" fill="#b45309">I₃⁻ entweicht → Entfärbung (reversibel)</text>
          </g>
        </svg>`;
      }

      // Geschlossene Amylose-Helix aus Sechsecken mit eingelagertem I3-/I5-
      const coords = [
        [52, 68], [86, 50], [124, 62], [156, 94], [194, 54], [232, 64], [268, 94], [306, 62]
      ];
      const links = coords
        .slice(1)
        .map(([x, y], i) => `<line x1="${coords[i][0]}" y1="${coords[i][1]}" x2="${x}" y2="${y}" stroke="#1d4ed8" stroke-width="2.5"/>`)
        .join("");
      const hexes = coords
        .map(([x, y]) => drawHexagon(x, y, 15, { fill: "#dbeafe", stroke: "#1d4ed8", label: "Glc" }))
        .join("");
      const iodChain = reagentAdded
        ? `<g>
            <line x1="88" y1="74" x2="292" y2="74" stroke="#1e1b4b" stroke-width="10" stroke-linecap="round" opacity="0.22"/>
            ${[105, 125, 145, 185, 205, 225, 255, 275].map((x) => `<circle cx="${x}" cy="74" r="6.5" fill="#1e1b4b"/>`).join("")}
            <text x="180" y="136" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1e3a8a">Polyiodid-Kette (I₃⁻ / I₅⁻) in Sechseck-Helix → tiefblau</text>
          </g>`
        : `<text x="180" y="136" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor">α-1,4-Sechseck-Helix der Amylose (wartet auf Lugol-Zugabe)</text>`;
      return `<svg viewBox="0 0 360 175" class="particle-svg" data-helix="closed" role="img" aria-label="Amylose-Helix aus Glucose-Sechsecken mit Polyiodid-Einlagerung">
        <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
        <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Amylose (α-1,4-verknüpfte Sechseck-Helix)</text>
        ${links}
        ${hexes}
        ${iodChain}
      </svg>`;
    }

    if (sampleId === "amylopektin") {
      const helixState = reagentAdded && heated ? "open" : "closed";
      const mainCoords = [[48, 108], [90, 108], [132, 108], [174, 108], [216, 108], [258, 108], [300, 108]];
      const branchCoords = [[174, 62], [216, 52], [258, 52]];
      const links = [
        ...mainCoords.slice(1).map(([x, y], i) => `<line x1="${mainCoords[i][0]}" y1="${mainCoords[i][1]}" x2="${x}" y2="${y}" stroke="#7e22ce" stroke-width="2.5"/>`),
        `<line x1="174" y1="92" x2="174" y2="76" stroke="#9333ea" stroke-width="2.5" stroke-dasharray="3 2"/>`,
        ...branchCoords.slice(1).map(([x, y], i) => `<line x1="${branchCoords[i][0]}" y1="${branchCoords[i][1]}" x2="${x}" y2="${y}" stroke="#9333ea" stroke-width="2.5"/>`)
      ].join("");
      const hexes = [
        ...mainCoords.map(([x, y]) => drawHexagon(x, y, 14, { fill: "#f3e8ff", stroke: "#7e22ce", label: "Glc" })),
        ...branchCoords.map(([x, y]) => drawHexagon(x, y, 13, { fill: "#fae8ff", stroke: "#9333ea", label: "Glc" }))
      ].join("");
      const status = reagentAdded
        ? helixState === "open"
          ? `<text x="180" y="152" text-anchor="middle" font-size="11.5" font-weight="700" fill="#b45309">Bei 80 °C gelöst: kürzere Iod-Ketten entweichen → entfärbt</text>`
          : `${[195, 215, 235].map((x) => `<circle cx="${x}" cy="52" r="5.5" fill="#581c87"/>`).join("")}
             <text x="180" y="152" text-anchor="middle" font-size="11.5" font-weight="700" fill="#6b21a8">α-1,6-Verzweigung → kürzere Helices → rotviolett</text>`
        : `<text x="180" y="152" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor">Verzweigte Sechseck-Ketten (α-1,4 & α-1,6)</text>`;

      return `<svg viewBox="0 0 360 175" class="particle-svg" data-helix="${helixState}" role="img" aria-label="Verzweigte Amylopektin-Sechseck-Kette">
        <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
        <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Amylopektin / Glykogen (verzweigte Sechsecke)</text>
        ${links}
        ${hexes}
        ${status}
      </svg>`;
    }

    if (sampleId === "cellulose") {
      const coords = [0, 1, 2, 3, 4, 5].map((i) => [55 + i * 50, 82]);
      const links = coords
        .slice(1)
        .map(([x, y], i) => `<line x1="${coords[i][0] + 16}" y1="${y}" x2="${x - 16}" y2="${y}" stroke="#0f766e" stroke-width="2.5"/>`)
        .join("");
      const hexes = coords
        .map(([x, y], i) => {
          const dir = i % 2 === 0 ? -1 : 1;
          const stub = `<line x1="${x}" y1="${y + dir * 14}" x2="${x}" y2="${y + dir * 24}" stroke="#0f766e" stroke-width="2"/><circle cx="${x}" cy="${y + dir * 25}" r="2.5" fill="#0f766e"/>`;
          return stub + drawHexagon(x, y, 16, { fill: "#ccfbf1", stroke: "#0f766e", label: "Glc" });
        })
        .join("");
      const iodOutside = reagentAdded
        ? `<circle cx="130" cy="134" r="5.5" fill="#d97706"/><circle cx="144" cy="134" r="5.5" fill="#b45309"/><circle cx="158" cy="134" r="5.5" fill="#d97706"/>
           <text x="172" y="138" font-size="11" font-weight="700" fill="#b45309">Kein Hohlraum → I₃⁻ bleibt frei (negativ)</text>`
        : `<text x="180" y="138" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor">Jedes 2. Sechseck 180° gedreht → gestreckt (keine Helix)</text>`;

      return `<svg viewBox="0 0 360 175" class="particle-svg" data-helix="none" data-orientation="alternating" role="img" aria-label="Gestreckte Cellulose-Sechseck-Kette ohne Helix">
        <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
        <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Cellulose (β-1,4-verknüpfte Sechseck-Kette)</text>
        ${links}
        ${hexes}
        ${iodOutside}
      </svg>`;
    }

    if (sampleId === "glucose") {
      return `<svg viewBox="0 0 360 175" class="particle-svg" data-helix="none" role="img" aria-label="Einzelner Glucose-Sechseck-Ring">
        <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
        <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">D-Glucose (einzelnes Sechseck, keine Kette)</text>
        ${drawHexagon(110, 86, 22, { fill: "#e0f2fe", stroke: "#0284c7", label: "Glc" })}
        ${reagentAdded
          ? `<circle cx="220" cy="86" r="6" fill="#d97706"/><circle cx="236" cy="86" r="6" fill="#b45309"/><circle cx="252" cy="86" r="6" fill="#d97706"/>
             <text x="180" y="142" text-anchor="middle" font-size="11.5" font-weight="700" fill="#b45309">Kein Helix-Hohlraum zur Einlagerung → negativ</text>`
          : `<text x="180" y="142" text-anchor="middle" font-size="11.5" fill="currentColor">Einzelne Monosaccharide bilden keine Helix</text>`}
      </svg>`;
    }

    return `<svg viewBox="0 0 360 175" class="particle-svg" data-helix="none" role="img" aria-label="Blindprobe Wasser">
      <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
      <text x="180" y="78" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Blindprobe: H₂O-Moleküle</text>
      <text x="180" y="106" text-anchor="middle" font-size="11.5" fill="currentColor">${reagentAdded ? "Gelbbraune Eigenfarbe des gelösten I₃⁻ (negativ)" : "Keine Kohlenhydrat-Strukturen vorhanden"}</text>
    </svg>`;
  }

  const db = ensureDatabase(root);

  const godExperiment = {
    id: "god-test",
    title: "GOD-Test",
    subtitle: "Enzymatischer Nachweis von β-D-Glucose",
    category: "Kohlenhydrate",
    tags: ["#Kohlenhydrate", "#Nachweis", "#Enzymatik"],
    level: "BF + LF",
    learningPathOrder: 1,
    summaryCard: {
      target: "Ausschließlich D-Glucose (enzymatisch hochspezifisch für β-D-Glucose)",
      reagent: "Teststreifen mit Enzym Glucose-Oxidase (GOD) & Indikatorfarbstoff (20 °C)",
      positiveSignal: "Testfeld schlägt von hellgelb nach kräftig dunkelgrün / blaugrün um"
    },
    labConfig: {
      apparatus: "test-strip",
      reagentLabel: "GOD-Teststreifen",
      reagentActionLabel: "GOD-Teststreifen eintauchen",
      supportsHeating: false,
      heatingHint: "Enzymreaktion läuft bei Raumtemperatur (20 °C) ab.",
      samples: [
        { id: "glucose", label: "D-Glucose", formulaHint: "Aldohexose" },
        { id: "fructose", label: "D-Fructose", formulaHint: "Ketohexose" },
        { id: "maltose", label: "Maltose", formulaHint: "Disaccharid" },
        { id: "saccharose", label: "Saccharose", formulaHint: "Disaccharid" },
        { id: "wasser", label: "Wasser", formulaHint: "Blindprobe" }
      ],
      getOutcome(sampleId, { reagentAdded }) {
        if (!reagentAdded) {
          return makeOutcome({
            statusBadge: "idle",
            liquidColor: "#e6f4fb",
            stripPadColor: "#f3e38d",
            observationShort: "Klare Probenlösung bereit. GOD-Teststreifen eintauchen."
          });
        }
        if (sampleId === "glucose") {
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#e6f4fb",
            stripPadColor: "#0e6b58",
            observationShort: "Beobachtung: Testfeld färbt sich kräftig dunkelgrün / blaugrün (D-Glucose positiv).",
            particleModelKey: "match"
          });
        }
        return makeOutcome({
          statusBadge: "negative",
          liquidColor: "#e6f4fb",
          stripPadColor: "#f3e38d",
          observationShort: "Beobachtung: Testfeld bleibt hellgelb (keine Bindung an GOD → negativ).",
          particleModelKey: "mismatch"
        });
      }
    },
    particleModel: {
      title: "Teilchenebene: Schlüssel-Schloss-Prinzip der Glucose-Oxidase",
      legend: [
        { color: "#0f766e", label: "Enzym GOD (aktives Zentrum)" },
        { color: "#0284c7", label: "β-D-Glucose (passend)" },
        { color: "#dc2626", label: "Andere Zucker (passen nicht)" }
      ],
      renderSvg(sampleId, state) {
        const active = Boolean(state && state.reagentAdded);
        const isPos = sampleId === "glucose";
        const negLabels = {
          fructose: "D-Fructose",
          maltose: "Maltose",
          saccharose: "Saccharose",
          wasser: "H₂O"
        };
        const badge = !active
          ? `<text x="180" y="156" text-anchor="middle" font-size="11" fill="currentColor">Teststreifen eintauchen, um Enzymbindung zu prüfen</text>`
          : isPos
            ? `<text x="180" y="156" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f766e">Schlüssel-Schloss passt → Testfeld färbt sich grün</text>`
            : `<text x="180" y="156" text-anchor="middle" font-size="11.5" font-weight="700" fill="#dc2626">Schlüssel-Schloss passt nicht → Testfeld bleibt gelb</text>`;

        return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Enzym-Substrat-Spezifität der Glucose-Oxidase">
          <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
          <path d="M24,42 H112 V64 L92,76 L112,88 V116 H24 Z" fill="#ccfbf1" stroke="#0f766e" stroke-width="2"/>
          <text x="58" y="84" text-anchor="middle" font-size="12" font-weight="700" fill="#134e4a">GOD</text>
          ${isPos
            ? `${drawHexagon(142, 76, 17, { fill: "#bae6fd", stroke: "#0284c7", label: "β-Glc" })}
               <path d="M168,76 H214" stroke="#0f766e" stroke-width="2.5" marker-end="url(#god-arrow)"/>
               <rect x="220" y="48" width="122" height="58" rx="8" fill="#dcfce7" stroke="#15803d" stroke-width="1.5"/>
               <text x="281" y="70" text-anchor="middle" font-size="10.5" font-weight="700" fill="#14532d">Enzymreaktion aktiv</text>
               <text x="281" y="90" text-anchor="middle" font-size="10.5" font-weight="700" fill="#0e6b58">→ grüner Farbstoff</text>`
            : `<rect x="132" y="56" width="88" height="40" rx="8" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
               <text x="176" y="80" text-anchor="middle" font-size="10.5" font-weight="700" fill="#991b1b">${negLabels[sampleId] || sampleId}</text>
               <text x="250" y="82" font-size="18" font-weight="800" fill="#dc2626">✕ blockiert</text>`}
          <defs><marker id="god-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#0f766e"/></marker></defs>
          ${badge}
        </svg>`;
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Funktionsweise des GOD-Nachweises & Mutarotation",
      blocks: [
        {
          heading: "Chemische Abläufe des GOD-Nachweises (Hinweis: nicht relevant für das Abitur)",
          html: "<ol><li><strong>Glucose-Oxidase (GOD):</strong> Oxidiert β-D-Glucose mit Luftsauerstoff zu Gluconsäure – dabei entsteht Wasserstoffperoxid (H<sub>2</sub>O<sub>2</sub>):<br><span class=\"chem-eq\">β-D-Glucose + O<sub>2</sub> + H<sub>2</sub>O → D-Gluconsäure + H<sub>2</sub>O<sub>2</sub></span></li><li><strong>Peroxidase (POD):</strong> Nutzt das entstandene H<sub>2</sub>O<sub>2</sub>, um eine farblose Vorstufe (Chromogen) auf dem Testfeld in den grünblauen Farbstoff zu überführen:<br><span class=\"chem-eq\">H<sub>2</sub>O<sub>2</sub> + Chromogen (farblos) → Farbstoff (grünblau) + 2 H<sub>2</sub>O</span></li></ol>"
        },
        {
          heading: "Warum wird auch α-D-Glucose komplett nachgewiesen?",
          html: "<p>In wässriger Lösung stehen α- und β-Anomer über die offenkettige Form im Gleichgewicht (<strong>Mutarotation</strong>):</p><p class=\"chem-eq\">α-D-Glucose (ca. 36 %) ⇌ offenkettige D-Glucose (&lt; 0,1 %) ⇌ β-D-Glucose (ca. 64 %)</p><p>Verbraucht die GOD laufend β-D-Glucose, verschiebt sich das Gleichgewicht nach dem <strong>Prinzip von Le Chatelier</strong> kontinuierlich nach rechts bis zum vollständigen Umsatz.</p>"
        }
      ]
    }
  };

  const benedictExperiment = {
    id: "benedict-probe",
    title: "Benedict-Probe",
    subtitle: "Nachweis reduzierender Zucker mit Cu²⁺",
    category: "Kohlenhydrate",
    tags: ["#Kohlenhydrate", "#Nachweis", "#Redox", "#Komplexchemie"],
    level: "BF + LF",
    learningPathOrder: 2,
    summaryCard: {
      target: "Reduzierende Zucker (freie bzw. über Ringöffnung zugängliche Aldehydgruppe)",
      reagent: "Benedict-Reagenz (alkalische Cu²⁺-Citrat-Lösung) + Wasserbad (80 °C)",
      positiveSignal: "Blaufärbung verblasst, ziegelroter Niederschlag von Kupfer(I)-oxid (Cu₂O↓)"
    },
    labConfig: {
      apparatus: "test-tube",
      reagentLabel: "Benedict-Reagenz",
      reagentActionLabel: "Benedict-Reagenz zugeben",
      supportsHeating: true,
      heatingHint: "Ohne Wärme keine Reaktion: Wasserbad (80 °C) zuschalten.",
      samples: [
        { id: "glucose", label: "D-Glucose", formulaHint: "Aldohexose" },
        { id: "fructose", label: "D-Fructose", formulaHint: "Ketohexose" },
        { id: "maltose", label: "Maltose", formulaHint: "α-1,4-Disaccharid" },
        { id: "saccharose", label: "Saccharose", formulaHint: "Vollacetal" },
        { id: "staerke", label: "Stärke", formulaHint: "Polysaccharid" },
        { id: "wasser", label: "Wasser", formulaHint: "Blindprobe" }
      ],
      getOutcome(sampleId, { reagentAdded, heated }) {
        if (!reagentAdded && heated) {
          return makeOutcome({
            statusBadge: "pending-reagent",
            liquidColor: "#e6f4fb",
            observationShort: "Ohne Benedict-Reagenz keine Farbreaktion – zuerst Reagenz zugeben."
          });
        }
        if (!reagentAdded) {
          return makeOutcome({
            statusBadge: "idle",
            liquidColor: "#e6f4fb",
            observationShort: "Klare Probenlösung bereit."
          });
        }
        if (!heated) {
          return makeOutcome({
            statusBadge: "pending-heat",
            liquidColor: "#1d6fd6",
            opacity: 0.84,
            observationShort: "Klare blaue Cu²⁺-Lösung. Bei 20 °C noch keine Reaktion – Wasserbad (80 °C) einschalten.",
            particleModelKey: "waiting-heat"
          });
        }
        if (sampleId === "glucose" || sampleId === "fructose" || sampleId === "maltose") {
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#8fbcc4",
            opacity: 0.62,
            precipitateColor: "#c84624",
            observationShort: "Beobachtung: Ziegelroter Niederschlag (Cu₂O↓) fällt im Wasserbad aus (Nachweis positiv).",
            particleModelKey: "positive"
          });
        }
        return makeOutcome({
          statusBadge: "negative",
          liquidColor: "#1d6fd6",
          opacity: 0.84,
          observationShort: "Beobachtung: Lösung bleibt auch bei 80 °C klar blau (kein reduzierender Zucker).",
          particleModelKey: "negative"
        });
      }
    },
    particleModel: {
      title: "Teilchenebene: Halbacetal-Öffnung & Elektronenübergang",
      legend: [
        { color: "#1d6fd6", label: "Cu²⁺ (+II, blau)" },
        { color: "#c84624", label: "Cu₂O (+I, ziegelrot)" },
        { color: "#0f766e", label: "Aldehyd → Carboxylat" }
      ],
      renderSvg(sampleId, state) {
        const ready = Boolean(state && state.reagentAdded && state.heated);
        if (sampleId === "saccharose") {
          return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Saccharose als nicht-reduzierendes Vollacetal">
            <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
            <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Saccharose: α-1,β-2-Vollacetal (beide Ringe blockiert)</text>
            ${drawHexagon(92, 82, 22, { fill: "#e0f2fe", stroke: "#0284c7", label: "Glc" })}
            <line x1="114" y1="82" x2="152" y2="82" stroke="#dc2626" stroke-width="3"/>
            <polygon points="154,66 190,66 200,90 172,106 144,90" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
            <text x="172" y="90" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">Fru</text>
            <text x="268" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#dc2626">✕ keine Ringöffnung</text>
            <text x="180" y="148" text-anchor="middle" font-size="11" font-weight="700" fill="#1d6fd6">Cu²⁺ bleibt unreduziert (Lösung bleibt blau)</text>
          </svg>`;
        }
        if (sampleId === "staerke") {
          return hexChainSvg("amylose", { reagentAdded: false, heated: false }).replace(
            "α-1,4-Sechseck-Helix der Amylose (wartet auf Lugol-Zugabe)",
            "Polysaccharid: verschwindend wenige Endgruppen → praktisch negativ"
          );
        }
        const isPos = sampleId === "glucose" || sampleId === "fructose" || sampleId === "maltose";
        return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Benedict Redoxreaktion auf Teilchenebene">
          <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
          ${isPos
            ? `<text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">${sampleId === "fructose" ? "Fructose ⇌ Endiol ⇌ Aldose" : "Halbacetal ⇌ offenkettiges Aldehyd"}</text>
               ${drawHexagon(58, 78, 18, { fill: "#e0f2fe", stroke: "#0284c7", label: sampleId === "maltose" ? "Mal" : "Ring" })}
               <text x="90" y="82" font-size="13" font-weight="700" fill="currentColor">⇌</text>
               <rect x="108" y="58" width="84" height="40" rx="8" fill="#ecfeff" stroke="#0f766e" stroke-width="1.8"/>
               <text x="150" y="82" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f766e">R–CHO</text>
               <path d="M196,78 H234" stroke="${ready ? "#c84624" : "#1d6fd6"}" stroke-width="2.5" marker-end="url(#ben-arrow)"/>
               <text x="215" y="68" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">2 e⁻</text>
               <rect x="240" y="48" width="102" height="60" rx="10" fill="${ready ? "#fee2e2" : "#dbeafe"}" stroke="${ready ? "#c84624" : "#1d6fd6"}" stroke-width="2"/>
               <text x="291" y="72" text-anchor="middle" font-size="11.5" font-weight="700" fill="${ready ? "#991b1b" : "#1e40af"}">${ready ? "Cu₂O↓ (rot)" : "2 Cu²⁺ (blau)"}</text>
               <text x="291" y="92" text-anchor="middle" font-size="10.5" fill="currentColor">+ R–COO⁻</text>
               <text x="180" y="148" text-anchor="middle" font-size="11" font-weight="700" fill="${ready ? "#c84624" : "#1d6fd6"}">${ready ? "Cu²⁺ → Cu⁺ reduziert (ziegelrotes Cu₂O↓)" : "Wärmezufuhr (80 °C) aktiviert die Redoxreaktion"}</text>`
            : `<text x="180" y="82" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Blindprobe Wasser: keine Aldehydgruppe</text>
               <text x="180" y="112" text-anchor="middle" font-size="11.5" fill="#1d6fd6">Cu²⁺-Citrat-Komplex bleibt klar blau</text>`}
          <defs><marker id="ben-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
        </svg>`;
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Redox-Teilgleichungen, Tautomerie & Citrat-Komplex",
      blocks: [
        {
          heading: "Redox-Teilgleichungen mit Oxidationszahlen",
          html: "<ul><li><strong>Oxidation (C1: +I → +III):</strong> R–CHO + 3 OH<sup>−</sup> → R–COO<sup>−</sup> + 2 H<sub>2</sub>O + 2 e<sup>−</sup></li><li><strong>Reduktion (Cu: +II → +I):</strong> 2 Cu<sup>2+</sup> + 2 OH<sup>−</sup> + 2 e<sup>−</sup> → Cu<sub>2</sub>O↓ + H<sub>2</sub>O</li><li><strong>Gesamt:</strong> R–CHO + 2 Cu<sup>2+</sup> + 5 OH<sup>−</sup> → R–COO<sup>−</sup> + Cu<sub>2</sub>O↓ + 3 H<sub>2</sub>O</li></ul>"
        },
        {
          heading: "Maltose vs. Saccharose & Keto-Enol-Tautomerie der Fructose",
          html: "<ul><li><strong>Maltose:</strong> Durch die α-1,4-Verknüpfung bleibt am zweiten Sechsring ein freies <strong>Halbacetal</strong> → Ringöffnung möglich → positiv.</li><li><strong>Saccharose:</strong> Beide anomeren C-Atome (C1 und C2) sind im α-1,β-2-<strong>Vollacetal</strong> blockiert → keine Ringöffnung → negativ.</li><li><strong>D-Fructose:</strong> Lagert sich im stark alkalischen Milieu über <strong>Keto-Enol-Tautomerie</strong> (Endiol-Zwischenstufe) teilweise in Aldosen um → positiv.</li></ul>"
        },
        {
          heading: "Koordinative Bindung im Benedict-Reagenz",
          html: "<p>Citrat-Ionen fungieren als mehrzähnige Liganden und bilden mit Cu<sup>2+</sup> einen löslichen <strong>Chelatkomplex</strong>. So fällt im Alkalischen kein unlösliches Cu(OH)<sub>2</sub> vorab aus.</p>"
        }
      ]
    }
  };

  const tollensExperiment = {
    id: "tollens-probe",
    title: "Tollens-Probe (Silberspiegel)",
    subtitle: "Nachweis reduzierender Zucker mit [Ag(NH₃)₂]⁺",
    category: "Kohlenhydrate",
    tags: ["#Kohlenhydrate", "#Nachweis", "#Redox", "#Komplexchemie"],
    level: "BF + LF",
    learningPathOrder: 3,
    summaryCard: {
      target: "Reduzierende Zucker / Aldehydgruppen (offenkettiges Gleichgewicht)",
      reagent: "Ammoniakalische AgNO₃-Lösung (enthält [Ag(NH₃)₂]⁺ und OH⁻) + Wasserbad (80 °C)",
      positiveSignal: "Elementares Silber (Ag↓) scheidet sich als metallischer Silberspiegel ab"
    },
    labConfig: {
      apparatus: "test-tube",
      reagentLabel: "Tollens-Reagenz",
      reagentActionLabel: "Tollens-Reagenz zugeben",
      supportsHeating: true,
      heatingHint: "Im warmen Wasserbad (80 °C) entsteht der Silberspiegel.",
      samples: [
        { id: "glucose", label: "D-Glucose", formulaHint: "Aldohexose" },
        { id: "fructose", label: "D-Fructose", formulaHint: "Ketohexose" },
        { id: "maltose", label: "Maltose", formulaHint: "α-1,4-Disaccharid" },
        { id: "saccharose", label: "Saccharose", formulaHint: "Vollacetal" },
        { id: "wasser", label: "Wasser", formulaHint: "Blindprobe" }
      ],
      getOutcome(sampleId, { reagentAdded, heated }) {
        if (!reagentAdded && heated) {
          return makeOutcome({
            statusBadge: "pending-reagent",
            liquidColor: "#e6f4fb",
            observationShort: "Ohne Tollens-Reagenz keine Abscheidung – zuerst Reagenz zugeben."
          });
        }
        if (!reagentAdded) {
          return makeOutcome({
            statusBadge: "idle",
            liquidColor: "#e6f4fb",
            observationShort: "Klare Probenlösung bereit."
          });
        }
        if (!heated) {
          return makeOutcome({
            statusBadge: "pending-heat",
            liquidColor: "#dce6ee",
            opacity: 0.45,
            observationShort: "Klare ammoniakalische Silber(I)-Lösung. Wasserbad (80 °C) zuschalten.",
            particleModelKey: "waiting-heat"
          });
        }
        if (sampleId === "glucose" || sampleId === "fructose" || sampleId === "maltose") {
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#cad2db",
            opacity: 0.65,
            mirrorEffect: true,
            observationShort: "Beobachtung: Metallischer Silberspiegel (Ag↓) bildet sich an der Glaswand (positiv).",
            particleModelKey: "positive"
          });
        }
        return makeOutcome({
          statusBadge: "negative",
          liquidColor: "#dce6ee",
          opacity: 0.45,
          mirrorEffect: false,
          observationShort: "Beobachtung: Lösung bleibt klar, kein Silberspiegel (Nachweis negativ).",
          particleModelKey: "negative"
        });
      }
    },
    particleModel: {
      title: "Teilchenebene: Reduktion von Ag⁺ zum Silberspiegel",
      legend: [
        { color: "#64748b", label: "Ag⁺ (+I) / [Ag(NH₃)₂]⁺" },
        { color: "#94a3b8", label: "Ag⁰ (Silberspiegel)" },
        { color: "#0f766e", label: "Aldehyd → Carboxylat" }
      ],
      renderSvg(sampleId, state) {
        const ready = Boolean(state && state.reagentAdded && state.heated);
        const isPos = sampleId === "glucose" || sampleId === "fructose" || sampleId === "maltose";
        return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Redoxreaktion der Tollens-Probe">
          <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
          ${isPos
            ? `<text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Elektronenübergang von R–CHO auf Ag⁺</text>
               <rect x="24" y="54" width="96" height="44" rx="8" fill="#ecfeff" stroke="#0f766e" stroke-width="1.8"/>
               <text x="72" y="80" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f766e">R–CHO</text>
               <path d="M126,76 H178" stroke="#475569" stroke-width="2.5" marker-end="url(#tol-arrow)"/>
               <text x="152" y="66" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">2 e⁻</text>
               <rect x="186" y="48" width="150" height="58" rx="10" fill="${ready ? "#cbd5e1" : "#f1f5f9"}" stroke="#475569" stroke-width="2"/>
               <text x="261" y="72" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">${ready ? "2 Ag↓ (Silberspiegel)" : "2 [Ag(NH₃)₂]⁺"}</text>
               <text x="261" y="92" text-anchor="middle" font-size="10.5" fill="#334155">${ready ? "+ R–COO⁻ + 4 NH₃" : "wird durch OH⁻ + Wärme aktiv"}</text>
               <text x="180" y="148" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">${ready ? "Silberatome lagern sich spiegelnd an der Glaswand ab" : "Wasserbad (80 °C) aktivieren"}</text>`
            : `<text x="180" y="78" text-anchor="middle" font-size="12.5" font-weight="700" fill="currentColor">${sampleId === "saccharose" ? "Saccharose (Vollacetal): keine freie Aldehydgruppe" : "Blindprobe Wasser: kein Reduktionsmittel"}</text>
               <text x="180" y="110" text-anchor="middle" font-size="11.5" fill="#64748b">[Ag(NH₃)₂]⁺ bleibt gelöst (kein Silberspiegel)</text>`}
          <defs><marker id="tol-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>
        </svg>`;
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Koordinative Bindung im Diamminsilber(I)-Komplex & Redox-OZ",
      blocks: [
        {
          heading: "Komplexchemie: Warum [Ag(NH₃)₂]⁺ statt freier Ag⁺-Ionen?",
          html: "<p>Im stark alkalischen Milieu würden freie Ag<sup>+</sup>-Ionen sofort als braunes Ag<sub>2</sub>O ausfallen. Ammoniak-Moleküle wirken mit ihrem freien Elektronenpaar am Stickstoff als <strong>Elektronenpaardonatoren (Liganden)</strong> gegenüber dem zentralen Ag<sup>+</sup>-Ion (<strong>Elektronenpaarakzeptor</strong>):</p><p class=\"chem-eq\">[H<sub>3</sub>N: → Ag<sup>+</sup> ← :NH<sub>3</sub>]<sup>+</sup> &nbsp;(linearer Diamminsilber(I)-Komplex, koordinative Bindung)</p>"
        },
        {
          heading: "Redox-Teilgleichungen mit Oxidationszahlen",
          html: "<ul><li><strong>Oxidation (C1: +I → +III):</strong> R–CHO + 3 OH<sup>−</sup> → R–COO<sup>−</sup> + 2 H<sub>2</sub>O + 2 e<sup>−</sup></li><li><strong>Reduktion (Ag: +I → 0):</strong> 2 [Ag(NH<sub>3</sub>)<sub>2</sub>]<sup>+</sup> + 2 e<sup>−</sup> → 2 Ag↓ + 4 NH<sub>3</sub></li><li><strong>Gesamt:</strong> R–CHO + 2 [Ag(NH<sub>3</sub>)<sub>2</sub>]<sup>+</sup> + 3 OH<sup>−</sup> → R–COO<sup>−</sup> + 2 Ag↓ + 4 NH<sub>3</sub> + 2 H<sub>2</sub>O</li></ul>"
        }
      ]
    }
  };

  const iodExperiment = {
    id: "iod-probe",
    title: "Iod-Probe (Lugolsche Lösung)",
    subtitle: "Nachweis von Stärke (Amylose-Helix)",
    category: "Kohlenhydrate",
    tags: ["#Kohlenhydrate", "#Nachweis", "#Einschlusskomplex"],
    level: "BF + LF",
    learningPathOrder: 4,
    summaryCard: {
      target: "Helikale Polysaccharide (v. a. unverzweigte Amylose in Stärke)",
      reagent: "Lugolsche Lösung (I₂ in KI-Lösung → I₃⁻-Ionen), Raumtemperatur (20 °C)",
      positiveSignal: "Tiefblauschwarzer Einschlusskomplex (beim Erhitzen reversibel entfärbt)"
    },
    labConfig: {
      apparatus: "test-tube",
      reagentLabel: "Lugolsche Lösung",
      reagentActionLabel: "Lugolsche Lösung zugeben",
      supportsHeating: true,
      heatingHint: "Thermische Reversibilität: bei 80 °C entfärbt sich die Helix, bei 20 °C färbt sie sich erneut.",
      samples: [
        { id: "amylose", label: "Stärke (Amylose)", formulaHint: "α-1,4-Sechseck-Helix" },
        { id: "amylopektin", label: "Amylopektin / Glykogen", formulaHint: "α-1,4 + α-1,6 verästelt" },
        { id: "cellulose", label: "Cellulose", formulaHint: "β-1,4 gestreckt" },
        { id: "glucose", label: "D-Glucose", formulaHint: "Monosaccharid" },
        { id: "wasser", label: "Wasser", formulaHint: "Blindprobe" }
      ],
      getOutcome(sampleId, { reagentAdded, heated }) {
        if (!reagentAdded && heated) {
          return makeOutcome({
            statusBadge: "pending-reagent",
            liquidColor: "#e6f4fb",
            observationShort: "Ohne Lugolsche Lösung keine Färbung – zuerst Reagenz zugeben."
          });
        }
        if (!reagentAdded) {
          return makeOutcome({
            statusBadge: "idle",
            liquidColor: "#e6f4fb",
            observationShort: "Klare Probenlösung (bzw. Suspension bei Cellulose) bereit."
          });
        }
        if (sampleId === "amylose") {
          if (heated) {
            return makeOutcome({
              statusBadge: "reversible-heated",
              liquidColor: "#f6e8a6",
              opacity: 0.55,
              observationShort: "Beobachtung (80 °C): Tiefblaue Farbe verschwindet – beim Abkühlen auf 20 °C kehrt sie zurück.",
              particleModelKey: "helix-open"
            });
          }
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#141b4d",
            opacity: 0.94,
            observationShort: "Beobachtung (20 °C): Tiefblauschwarzer Einschlusskomplex (Polyiodid in Amylose-Helix).",
            particleModelKey: "helix-closed"
          });
        }
        if (sampleId === "amylopektin") {
          if (heated) {
            return makeOutcome({
              statusBadge: "reversible-heated",
              liquidColor: "#f6e8a6",
              opacity: 0.55,
              observationShort: "Beobachtung (80 °C): Rotviolette Farbe entweicht reversibel durch Helix-Weitung.",
              particleModelKey: "helix-open"
            });
          }
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#5b234d",
            opacity: 0.88,
            observationShort: "Beobachtung (20 °C): Rotviolette Färbung durch kürzere verzweigte Sechseck-Helices.",
            particleModelKey: "helix-branched"
          });
        }
        return makeOutcome({
          statusBadge: "negative",
          liquidColor: "#c88a1e",
          opacity: 0.65,
          observationShort: "Beobachtung: Gelbbraune Eigenfarbe der Lugolschen Lösung bleibt (keine Helix-Einlagerung).",
          particleModelKey: "no-helix"
        });
      }
    },
    particleModel: {
      title: "Teilchenebene: Polysaccharide als Ketten von Sechsecken (= Glucose)",
      legend: [
        { color: "#1d4ed8", label: "Sechseck = Glucose-Baustein" },
        { color: "#1e1b4b", label: "I₃⁻ / I₅⁻-Polyiodid-Kette" },
        { color: "#0f766e", label: "Cellulose (gestreckte Kette)" }
      ],
      renderSvg(sampleId, state) {
        return hexChainSvg(sampleId, state);
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Thermische Reversibilität & Amylose vs. Amylopektin",
      blocks: [
        {
          heading: "Warum ist die Blaufärbung bei 80 °C reversibel?",
          html: "<p>Bei Wärmezufuhr lösen verstärkte Teilchenbewegungen die stabilisierenden <strong>Wasserstoffbrücken</strong> innerhalb der Amylose-Sechseck-Helix. Die Helix windet sich auf, die linearen I<sub>3</sub><sup>−</sup>/I<sub>5</sub><sup>−</sup>-Ketten gleiten heraus (Entfärbung). Beim Abkühlen faltet sich die Helix zurück und schließt Polyiodid erneut ein.</p>"
        },
        {
          heading: "Strukturvergleich mit Sechseck-Ketten: Amylose vs. Amylopektin / Glykogen",
          html: "<p>Unverzweigte <strong>Amylose</strong> (α-1,4) bildet lange Helices für lange Polyiodid-Ketten (tiefblau). Zusätzliche <strong>α-1,6-Verzweigungen</strong> bei Amylopektin bzw. Glykogen verkürzen die geraden Helix-Abschnitte → kürzere eingelagerte Iod-Ketten verschieben die Farbe zu <strong>rotviolett bis rotbraun</strong>.</p>"
        }
      ]
    }
  };

  registerExperiment(db, godExperiment);
  registerExperiment(db, benedictExperiment);
  registerExperiment(db, tollensExperiment);
  registerExperiment(db, iodExperiment);
})(typeof window !== "undefined" ? window : globalThis);
