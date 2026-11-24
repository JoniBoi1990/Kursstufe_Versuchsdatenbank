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

  const db = ensureDatabase(root);

  const ninhydrinExperiment = {
    id: "ninhydrin-nachweis",
    title: "Ninhydrin-Nachweis",
    subtitle: "Nachweis freier α-Aminosäuren (−NH₂)",
    category: "Proteine",
    tags: ["#Proteine", "#Nachweis"],
    level: "BF + LF",
    learningPathOrder: 5,
    summaryCard: {
      target: "Freie α-Aminosäuren (freie α-NH₂- & α-COOH-Gruppe am selben C-Atom; Peptide, Polypeptide & Proteine negativ)",
      reagent: "Ninhydrin-Lösung + Wasserbad (80 °C)",
      positiveSignal: "Intensive blauviolette Färbung durch den Farbstoff Ruhemanns Purpur"
    },
    labConfig: {
      apparatus: "test-tube",
      reagentLabel: "Ninhydrin-Lösung",
      reagentActionLabel: "Ninhydrin-Lösung zugeben",
      supportsHeating: true,
      heatingHint: "Die Kondensation zu Ruhemanns Purpur benötigt Wärme (80 °C).",
      samples: [
        { id: "glycin", label: "Glycin", formulaHint: "Freie Aminosäure" },
        { id: "dipeptid", label: "Dipeptid (Gly-Ala)", formulaHint: "Kurzes Peptid" },
        { id: "protein", label: "Protein (Albumin)", formulaHint: "Polypeptid-Makromolekül" },
        { id: "wasser", label: "Wasser", formulaHint: "Blindprobe" }
      ],
      getOutcome(sampleId, { reagentAdded, heated }) {
        if (!reagentAdded && heated) {
          return makeOutcome({
            statusBadge: "pending-reagent",
            liquidColor: "#e6f4fb",
            observationShort: "Ohne Ninhydrin-Lösung keine Farbreaktion – zuerst Reagenz zugeben."
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
            liquidColor: "#edf2f7",
            opacity: 0.42,
            observationShort: "Mischung bei 20 °C farblos. Wasserbad (80 °C) einschalten.",
            particleModelKey: "waiting-heat"
          });
        }
        if (sampleId === "glycin") {
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#4a247a",
            opacity: 0.9,
            observationShort: "Beobachtung: Tief blauviolette Lösung (Ruhemanns Purpur → freie α-Aminosäure positiv).",
            particleModelKey: "positive"
          });
        }
        if (sampleId === "dipeptid") {
          return makeOutcome({
            statusBadge: "negative",
            liquidColor: "#edf2f7",
            opacity: 0.42,
            observationShort:
              "Beobachtung: Keine blauviolette Färbung bei Dipeptid/kurzen Peptiden (Peptidbindung blockiert die α-Carboxygruppe am N-Terminus → keine Decarboxylierung).",
            particleModelKey: "negative"
          });
        }
        if (sampleId === "protein") {
          return makeOutcome({
            statusBadge: "negative",
            liquidColor: "#edf2f7",
            opacity: 0.55,
            observationShort:
              "Beobachtung: Keine blauviolette Färbung bei Polypeptiden/Proteinen (Aminogruppen in Peptidbindungen gebunden, fehlende freie α-Carboxygruppe am N-Terminus; ggf. leichte Trübung durch Hitzedenaturierung).",
            particleModelKey: "negative"
          });
        }
        return makeOutcome({
          statusBadge: "negative",
          liquidColor: "#edf2f7",
          opacity: 0.42,
          observationShort: "Beobachtung: Lösung bleibt farblos (keine freie Aminosäure).",
          particleModelKey: "negative"
        });
      }
    },
    particleModel: {
      title: "Teilchenebene: Kondensation zweier Ninhydrin-Reste mit freiem α-NH₂",
      legend: [
        { color: "#64748b", label: "Ninhydrin-Gerüst" },
        { color: "#0f766e", label: "Freie α-NH₂-Gruppe" },
        { color: "#5b21b6", label: "Ruhemanns Purpur" }
      ],
      renderSvg(sampleId, state) {
        const ready = Boolean(state && state.reagentAdded && state.heated);
        if (sampleId === "dipeptid") {
          return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Negativer Ninhydrin-Nachweis bei Dipeptid Gly-Ala">
            <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
            <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Dipeptid (Gly-Ala): α-COOH in Peptidbindung gebunden</text>
            <rect x="18" y="54" width="224" height="44" rx="10" fill="#f1f5f9" stroke="#64748b" stroke-width="1.8"/>
            <text x="130" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">H₂N–CH(R¹)–CO–NH–CH(R²)–COOH</text>
            <text x="298" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="#dc2626">✕ blockiert</text>
            <text x="180" y="132" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">Keine freie α-COOH am N-Terminus → kein Ruhemanns Purpur</text>
            <text x="180" y="152" text-anchor="middle" font-size="10.5" fill="currentColor">Auch kurze Peptidketten reagieren im Ninhydrin-Test negativ</text>
          </svg>`;
        }
        if (sampleId === "protein") {
          return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Negativer Ninhydrin-Nachweis bei Protein Albumin">
            <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
            <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">Polypeptid / Protein (Albumin): N-Atome in Peptidbindungen gebunden</text>
            <rect x="24" y="54" width="214" height="44" rx="10" fill="#f1f5f9" stroke="#64748b" stroke-width="1.8"/>
            <text x="131" y="80" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1e293b">…–CO–NH–CH(R)–CO–NH–…</text>
            <text x="292" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="#dc2626">✕ blockiert</text>
            <text x="180" y="132" text-anchor="middle" font-size="11" font-weight="700" fill="#dc2626">Peptidbindungen + fehlende freie α-COOH → kein Ruhemanns Purpur</text>
            <text x="180" y="152" text-anchor="middle" font-size="10.5" fill="currentColor">Erst nach Hydrolyse zu freien Aminosäuren positiv (Protein-Nachweis: Biuret!)</text>
          </svg>`;
        }
        if (sampleId === "wasser") {
          return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Blindprobe Wasser beim Ninhydrin-Nachweis">
            <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
            <text x="180" y="78" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">Blindprobe Wasser: keine −NH₂-Gruppe</text>
            <text x="180" y="106" text-anchor="middle" font-size="11.5" fill="currentColor">Ninhydrin findet keinen Reaktionspartner → farblos</text>
          </svg>`;
        }
        const label = "Freie α-Aminosäure (α-NH₂ + α-COOH frei)";
        return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Bildung von Ruhemanns Purpur">
          <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
          <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">${label}</text>
          <rect x="20" y="54" width="84" height="44" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1.8"/>
          <text x="62" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">Ninhydrin</text>
          <circle cx="130" cy="76" r="18" fill="#ccfbf1" stroke="#0f766e" stroke-width="2"/>
          <text x="130" y="80" text-anchor="middle" font-size="11" font-weight="800" fill="#134e4a">−NH₂</text>
          <rect x="156" y="54" width="84" height="44" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1.8"/>
          <text x="198" y="80" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">Ninhydrin</text>
          <path d="M244,76 H274" stroke="${ready ? "#5b21b6" : "#64748b"}" stroke-width="2.5" marker-end="url(#nin-arrow)"/>
          <rect x="278" y="48" width="66" height="58" rx="10" fill="${ready ? "#ede9fe" : "#f8fafc"}" stroke="${ready ? "#5b21b6" : "#94a3b8"}" stroke-width="2"/>
          <text x="311" y="72" text-anchor="middle" font-size="10.5" font-weight="700" fill="${ready ? "#4c1d95" : "#475569"}">${ready ? "Ruhemanns" : "Wartet"}</text>
          <text x="311" y="88" text-anchor="middle" font-size="10.5" font-weight="700" fill="${ready ? "#4c1d95" : "#475569"}">${ready ? "Purpur" : "auf 80 °C"}</text>
          <text x="180" y="146" text-anchor="middle" font-size="11" font-weight="700" fill="${ready ? "#4c1d95" : "currentColor"}">${ready ? "N-Atom verbrückt zwei Ninhydrin-Reste → blauviolett" : "Erst bei 80 °C bildet sich der konjugierte Farbstoff"}</text>
          <defs><marker id="nin-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
        </svg>`;
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Kondensationsreaktion & Abgrenzung zu Peptiden/Proteinen",
      blocks: [
        {
          heading: "Kondensation unter Abbau des Aminosäuregerüsts",
          html: "<p class=\"chem-eq\">2 Ninhydrin + α-Aminosäure → Ruhemanns Purpur + CO<sub>2</sub>↑ + R–CHO + 3 H<sub>2</sub>O</p><ul><li>Nur das <strong>Stickstoffatom</strong> der ursprünglichen α-Aminogruppe wird als Brücke zwischen beiden Ninhydrin-Molekülen eingebaut.</li><li>Die Carboxygruppe entweicht durch <strong>Decarboxylierung</strong> als CO<sub>2</sub>, der Rest verlässt die Reaktion als Aldehyd (R–CHO) unter Abspaltung von H<sub>2</sub>O.</li><li><strong>Warum bleiben Peptide, Polypeptide und Proteine negativ?</strong> Im Peptid- bzw. Proteinrückgrat sind fast alle Aminogruppen als stabile Peptidbindungen (–CO–NH–) gebunden. Selbst am freien N-Terminus – auch bei kurzen Peptiden (z. B. Dipeptiden) oder angesäuerter Molke – fehlt die freie α-Carboxygruppe am selben C-Atom für die Decarboxylierung zu Ruhemanns Purpur; Proteine koagulieren zudem bei 80 °C. Erst eine Hydrolyse zu freien α-Aminosäuren macht den Nachweis positiv.</li></ul>"
        }
      ]
    }
  };

  const biuretExperiment = {
    id: "biuret-probe",
    title: "Biuret-Probe",
    subtitle: "Nachweis von Peptiden & Proteinen (≥ 2 Peptidbindungen)",
    category: "Proteine",
    tags: ["#Proteine", "#Nachweis", "#Komplexchemie"],
    level: "BF + LF",
    learningPathOrder: 6,
    summaryCard: {
      target: "Peptidbindungen – mindestens zwei pro Molekül (ab Tripeptid / Polypeptid)",
      reagent: "Natronlauge (NaOH, stark alkalisch) + verdünnte CuSO₄-Lösung (Cu²⁺), 20 °C",
      positiveSignal: "Farbumschlag von hellblau zu rotviolett (lila)"
    },
    labConfig: {
      apparatus: "test-tube",
      reagentLabel: "NaOH + CuSO₄",
      reagentActionLabel: "NaOH & CuSO₄ zugeben",
      supportsHeating: false,
      heatingHint: "Komplexbildung läuft direkt bei Raumtemperatur (20 °C) ab.",
      samples: [
        { id: "protein", label: "Protein (Albumin)", formulaHint: "Viele Peptidbindungen" },
        { id: "tripeptid", label: "Tripeptid", formulaHint: "2 Peptidbindungen (Grenzfall)" },
        { id: "dipeptid", label: "Dipeptid", formulaHint: "Nur 1 Peptidbindung!" },
        { id: "glycin", label: "Glycin", formulaHint: "0 Peptidbindungen" },
        { id: "wasser", label: "Wasser", formulaHint: "Blindprobe" }
      ],
      getOutcome(sampleId, { reagentAdded }) {
        if (!reagentAdded) {
          return makeOutcome({
            statusBadge: "idle",
            liquidColor: "#e6f4fb",
            observationShort: "Klare Probenlösung bereit."
          });
        }
        if (sampleId === "protein" || sampleId === "tripeptid") {
          return makeOutcome({
            statusBadge: "positive",
            liquidColor: "#7c2d6e",
            opacity: 0.88,
            observationShort: "Beobachtung: Rotvioletter Farbkomplex bildet sich (≥ 2 Peptidbindungen positiv).",
            particleModelKey: "chelate-positive"
          });
        }
        return makeOutcome({
          statusBadge: "negative",
          liquidColor: "#9ecff5",
          opacity: 0.65,
          observationShort: "Beobachtung: Lösung bleibt hellblau (< 2 Peptidbindungen → kein Biuret-Komplex).",
          particleModelKey: "no-chelate"
        });
      }
    },
    particleModel: {
      title: "Teilchenebene: Strukturelle Mindestvoraussetzung (≥ 2 Peptidbindungen)",
      legend: [
        { color: "#7c2d6e", label: "Rotvioletter Cu²⁺-Komplex (ab Tripeptid)" },
        { color: "#2563eb", label: "Freies / hydratisiertes Cu²⁺ (hellblau)" }
      ],
      renderSvg(sampleId, state) {
        const added = Boolean(state && state.reagentAdded);
        const isPos = sampleId === "protein" || sampleId === "tripeptid";
        if (isPos) {
          return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Biuret-Komplex mit mindestens zwei Peptidbindungen">
            <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
            <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">${sampleId === "tripeptid" ? "Tripeptid (2 Peptidbindungen)" : "Polypeptid / Protein (≥ 2 Peptidbindungen)"}</text>
            <path d="M58,52 H302" stroke="#7c2d6e" stroke-width="4" stroke-linecap="round"/>
            <circle cx="115" cy="52" r="11" fill="#f3e8ff" stroke="#7c2d6e" stroke-width="2"/>
            <text x="115" y="56" text-anchor="middle" font-size="10.5" font-weight="800" fill="#6b21a8">N</text>
            <circle cx="245" cy="52" r="11" fill="#f3e8ff" stroke="#7c2d6e" stroke-width="2"/>
            <text x="245" y="56" text-anchor="middle" font-size="10.5" font-weight="800" fill="#6b21a8">N</text>
            <circle cx="180" cy="96" r="18" fill="${added ? "#7c2d6e" : "#dbeafe"}" stroke="${added ? "#581c87" : "#2563eb"}" stroke-width="2"/>
            <text x="180" y="100" text-anchor="middle" font-size="11.5" font-weight="800" fill="${added ? "#ffffff" : "#1e40af"}">Cu²⁺</text>
            <line x1="123" y1="61" x2="164" y2="85" stroke="#7c2d6e" stroke-width="2" stroke-dasharray="4 3"/>
            <line x1="237" y1="61" x2="196" y2="85" stroke="#7c2d6e" stroke-width="2" stroke-dasharray="4 3"/>
            <line x1="123" y1="126" x2="164" y2="106" stroke="#7c2d6e" stroke-width="2" stroke-dasharray="4 3"/>
            <line x1="237" y1="126" x2="196" y2="106" stroke="#7c2d6e" stroke-width="2" stroke-dasharray="4 3"/>
            <text x="180" y="152" text-anchor="middle" font-size="11" font-weight="700" fill="#7c2d6e">${added ? "Stabiler Komplex aus Peptid-N und Cu²⁺ → rotviolett" : "NaOH + CuSO₄ zugeben"}</text>
          </svg>`;
        }

        const msg = sampleId === "dipeptid"
          ? "Dipeptid (nur 1 Peptidbindung): kein geschlossener Komplex möglich"
          : sampleId === "glycin"
            ? "Freie Aminosäure (0 Peptidbindungen): kein Farbkomplex"
            : "Blindprobe Wasser: keine Peptidbindungen";
        return `<svg viewBox="0 0 360 175" class="particle-svg" role="img" aria-label="Negativer Biuret-Nachweis">
          <rect x="4" y="4" width="352" height="167" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.14"/>
          <text x="18" y="24" font-size="11.5" font-weight="700" fill="currentColor">${msg}</text>
          <circle cx="180" cy="86" r="20" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
          <text x="180" y="90" text-anchor="middle" font-size="12" font-weight="800" fill="#1e40af">Cu²⁺</text>
          <text x="242" y="90" font-size="16" font-weight="800" fill="#dc2626">✕ zu wenig N-Liganden</text>
          <text x="180" y="148" text-anchor="middle" font-size="11.5" font-weight="700" fill="#2563eb">Lösung bleibt hellblau (negativ)</text>
        </svg>`;
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Deprotonierung & koordinative Bindung (Chelatkomplex)",
      blocks: [
        {
          heading: "Rolle von NaOH & CuSO₄ und koordinative Bindung",
          html: "<ul><li><strong>NaOH (alkalisches Milieu):</strong> Hydroxid-Ionen deprotonieren die Stickstoffatome der Peptidbindungen (–CO–NH– → –CO–N<sup>−</sup>–).</li><li><strong>CuSO₄:</strong> Liefert das zentrale Cu<sup>2+</sup>-Kation (<strong>Elektronenpaarakzeptor</strong>).</li><li><strong>Koordinative Bindung:</strong> Die freien Elektronenpaare von vier deprotonierten Peptid-Stickstoffatomen wirken als <strong>Elektronenpaardonatoren (Liganden)</strong> und bilden mit Cu<sup>2+</sup> einen quadratisch-planaren <strong>Chelatkomplex</strong> (rotviolett).</li></ul><svg viewBox=\"0 0 340 120\" class=\"particle-svg lf-chelate-svg\" role=\"img\" aria-label=\"Quadratisch-planarer Cu2+ Biuret Chelatkomplex\"><rect x=\"4\" y=\"4\" width=\"332\" height=\"112\" rx=\"10\" fill=\"none\" stroke=\"currentColor\" stroke-opacity=\"0.14\"/><text x=\"170\" y=\"22\" text-anchor=\"middle\" font-size=\"10.5\" font-weight=\"700\" fill=\"currentColor\">Quadratisch-planarer Chelatkomplex (4 koordinative Bindungen)</text><text x=\"102\" y=\"52\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#5b3cc4\">–CO–N⁻:</text><text x=\"238\" y=\"52\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#5b3cc4\">:N⁻–CO–</text><text x=\"102\" y=\"100\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#5b3cc4\">–CO–N⁻:</text><text x=\"238\" y=\"100\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"700\" fill=\"#5b3cc4\">:N⁻–CO–</text><circle cx=\"170\" cy=\"70\" r=\"16\" fill=\"#7c2d6e\"/><text x=\"170\" y=\"74\" text-anchor=\"middle\" font-size=\"11\" font-weight=\"800\" fill=\"#ffffff\">Cu²⁺</text><line x1=\"130\" y1=\"52\" x2=\"154\" y2=\"64\" stroke=\"#5b3cc4\" stroke-width=\"2\"/><line x1=\"210\" y1=\"52\" x2=\"186\" y2=\"64\" stroke=\"#5b3cc4\" stroke-width=\"2\"/><line x1=\"130\" y1=\"92\" x2=\"154\" y2=\"78\" stroke=\"#5b3cc4\" stroke-width=\"2\"/><line x1=\"210\" y1=\"92\" x2=\"186\" y2=\"78\" stroke=\"#5b3cc4\" stroke-width=\"2\"/></svg>"
        }
      ]
    }
  };

  registerExperiment(db, ninhydrinExperiment);
  registerExperiment(db, biuretExperiment);
})(typeof window !== "undefined" ? window : globalThis);
