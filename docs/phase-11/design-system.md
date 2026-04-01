# Phase 11.1.2 — Design System Deterministico

## Principi di determinismo percettivo

- A parità di decision trace, mode e stato UI il rendering è **pixel-stabile e semanticamente identico**.
- Vietati: adattamenti visivi non tracciati, animazioni semantiche, variazioni runtime non spiegabili.
- Scala tipografica, spacing e palette sono **fissi**; nessun autoscaling o spacing dinamico a runtime.

## Relazione con explainability IRIS

- Il design system è **explainability-first**: ogni scelta visiva deve aumentare la comprensione della decisione.
- Vietato: nascondere safety o blocchi, persuadere l’utente.
- Il design system è **neutrale, esplicativo, auditabile**.

## Mapping mode → segnali visivi

| Mode     | Effetto consentito              | Effetto vietato                    |
|----------|----------------------------------|------------------------------------|
| DEFAULT  | Colore primary/surface/outline   | Layout, gerarchia, presenza info   |
| FOCUS    | Colore primary/surface/outline   | Layout, gerarchia, presenza info   |
| WELLBEING| Colore primary/surface/outline   | Layout, gerarchia, presenza info   |

- Le mode modificano **solo colore** (e micro-enfasi visiva safety).
- Non modificano: layout, gerarchia informativa, presenza di explainability.

## Regole di non-ambiguità

- **Safety**: colori dedicati (safetyNeutral, safetyCaution, safetyBlock); significato esplicito, invariante tra mode.
- **Contrasto**: palette verificabile per accessibilità; nessun colore puramente decorativo con significato semantico.
- **Componenti**: IrisText, IrisButton, IrisCard, IrisSection sono puramente presentazionali; stile solo da token; nessuna logica decisionale.

## Strategia golden testing

- **test/golden/design_system/**: typography_golden_test, colors_mode_golden_test, components_golden_test.
- Verifica: rendering deterministico, coerenza tra mode (nessuna variazione di layout), componenti stabili.
- Obiettivo: **pixel diff = ZERO** tra run su stesso ambiente; cross-platform da verificare con stesso font/metriche.

## Struttura implementata

- **tokens/**: typography.dart, colors.dart, spacing.dart.
- **theme/**: iris_theme.dart (IrisThemeData.fromMode).
- **components/**: iris_text.dart, iris_button.dart, iris_card.dart, iris_section.dart.

## Allineamento Certification Gates

- **Gate A — Determinismo UI**: PASS (token fissi, theme da token, componenti presentazionali).
- **Gate B — Explainability Integrity**: PASS (nessun elemento nasconde informazioni; safety sempre percepibile).
- **Gate D — Safety Perception**: PASS (colori safety espliciti; mode non alterano percezione safety).
