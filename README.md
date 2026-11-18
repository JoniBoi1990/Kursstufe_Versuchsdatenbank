# Interaktive Versuchsdatenbank Kursstufe Chemie (Schule Birklehof)

> **Digitales Versuchskompendium & Nachschlagewerk für das Basisfach (BP 3.3.3) und Leistungsfach (BP 3.4.4)**  
> Aktuelles Modul: **Nachweisreaktionen für Kohlenhydrate und Proteine** (GOD-Test, Benedict-Probe, Tollens-Probe, Iod-Probe, Ninhydrin-Nachweis, Biuret-Probe).

---

## Didaktisches Konzept

* **Datenbank-Modus (Versuchsplanung):** Lernende schlagen Spezifitäten, Bedingungen und molekulare Hintergründe gezielt nach und erproben Proben interaktiv, um anschließend **eigene Versuchsreihen selbst zu kombinieren** (bewusst ohne vorgefertigte Proben-×-Nachweis-Lösungsmatrix).
* **Lernpfad-Modus (Asynchrones Arbeiten):** Sequenzielles Durcharbeiten aller Versuche Schritt für Schritt von zu Hause mit Fortschrittsanzeige (`localStorage`).
* **BF / LF-Differenzierung:** Basiswissen steht knapp und bildstark im Vordergrund; Leistungsfach-Vertiefungen (Redox-Teilgleichungen mit Oxidationszahlen, koordinative Bindung/Komplexchemie, Keto-Enol-Tautomerie, Mutarotation, thermische Reversibilität) liegen in farblich abgesetzten, einzeln oder global über den Header aufklappbaren LF-Boxen.
* **Einheitliche Polysaccharid-Modelle:** Polysaccharide (Amylose, Amylopektin/Glykogen, Cellulose) werden auf der Teilchenebene konsequent als **Ketten aus Sechsecken (= Glucose-Einheiten)** dargestellt.

---

## Inbetriebnahme (Serverfrei / `file://`)

1. Den Ordner `Kursstufe_Versuchsdatenbank/` öffnen.
2. Doppelklick auf `index.html` — läuft komplett ohne Webserver oder Internetverbindung auf Desktop, Laptop und Schul-iPad.

---

## Dateistruktur

```text
Kursstufe_Versuchsdatenbank/
├── index.html                  # App-Shell, Header (Modus, Suche, LF-Toggle, Theme), Split-Screen
├── style.css                   # Responsive @container-Layout, Light/Dark Mode, LF-Accordion-Styling
├── app.js                      # Katalog-/Lernpfad-Controller, Labor-Zustandsmaschine, SVG-Gefäße
├── data/
│   ├── kh_nachweise.js         # GOD-Test, Benedict-Probe, Tollens-Probe, Iod-Probe
│   └── proteine_nachweise.js   # Ninhydrin-Nachweis, Biuret-Probe
├── tests/                      # Automatisierte Node.js-Tests (node --test)
└── assets/                     # birklehof_logo.png, mint_logo.png
```

---

## Neue Kursstufen-Versuche hinzufügen (Plug & Play)

Da die App ohne Build-Tool direkt per `file://` läuft, registrieren neue Themenmodule ihre Versuche über `<script defer>` in `window.VERSUCHS_DATENBANK`:

1. Neue Datei unter `data/<thema>_versuche.js` nach folgender Vorlage anlegen:

```javascript
(function (root) {
  "use strict";
  const db = (root.VERSUCHS_DATENBANK = root.VERSUCHS_DATENBANK || {
    categories: [],
    learningPaths: [],
    experiments: []
  });

  if (!db.categories.includes("Fette")) {
    db.categories.push("Fette");
  }

  db.experiments.push({
    id: "brom-probe-fette",
    title: "Brom-Probe auf Doppelbindungen",
    subtitle: "Nachweis ungesättigter Fettsäurereste",
    category: "Fette",
    tags: ["#Fette", "#Nachweis"],
    level: "BF + LF",
    learningPathOrder: 7,
    summaryCard: {
      target: "C=C-Doppelbindungen in ungesättigten Fettsäureresten",
      reagent: "Bromwasser (verdünnt), Raumtemperatur",
      positiveSignal: "Rasche Entfärbung der braunroten Bromlösung"
    },
    labConfig: {
      apparatus: "test-tube",
      reagentLabel: "Bromwasser",
      reagentActionLabel: "Bromwasser zugeben",
      supportsHeating: false,
      heatingHint: "",
      samples: [
        { id: "olivenoel", label: "Olivenöl", formulaHint: "ungesättigt" },
        { id: "kokosfett", label: "Kokosfett", formulaHint: "gesättigt" }
      ],
      getOutcome(sampleId, { reagentAdded }) {
        if (!reagentAdded) {
          return {
            statusBadge: "idle",
            liquidColor: "#fef3c7",
            opacity: 0.45,
            precipitateColor: null,
            mirrorEffect: false,
            stripPadColor: null,
            observationShort: "Probe bereit."
          };
        }
        return sampleId === "olivenoel"
          ? {
              statusBadge: "positive",
              liquidColor: "#fef9c3",
              opacity: 0.4,
              precipitateColor: null,
              mirrorEffect: false,
              stripPadColor: null,
              observationShort: "Beobachtung: Braunfärbung entfärbt sich sofort (positiv)."
            }
          : {
              statusBadge: "negative",
              liquidColor: "#9a3412",
              opacity: 0.78,
              precipitateColor: null,
              mirrorEffect: false,
              stripPadColor: null,
              observationShort: "Beobachtung: Braunrote Bromfarbe bleibt bestehen (negativ)."
            };
      }
    },
    particleModel: {
      title: "Teilchenebene: Elektrophile Addition an C=C",
      legend: [],
      renderSvg() {
        return `<svg viewBox="0 0 360 140" class="particle-svg"><text x="180" y="75" text-anchor="middle" fill="currentColor">C=C + Br₂ → Dibromalkan</text></svg>`;
      }
    },
    lfSection: {
      title: "LF-Vertiefung: Mechanismus der elektrophilen Addition",
      blocks: [
        { heading: "Polarisierung & Bromonium-Ion", html: "<p>...</p>" }
      ]
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
```

2. In `index.html` vor `app.js` einbinden:
```html
<script defer src="data/<thema>_versuche.js"></script>
```
Filter-Chips, Suche und Katalogkarten aktualisieren sich automatisch.
