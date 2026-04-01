# Phase 11.1.5 — Explainability UI Foundation

## Principi explainability-first

- Ogni decisione mostrata ha titolo chiaro, descrizione esplicativa, stato di safety visivo coerente.
- Nessun contenuto implicito o ambiguo.
- La UI non genera spiegazioni: riceve solo un ViewModel già deterministico.

## Mapping safety → segnali visivi

| SafetyLevel | Colore token   | Badge label |
|-------------|----------------|-------------|
| neutral     | safetyNeutral  | Neutral     |
| caution     | safetyCaution  | Caution     |
| block       | safetyBlock    | Block       |

Colori da design system (IrisColors); nessuna variazione non tracciata.

## Determinismo rendering

- Explainability UI è completamente statica rispetto all’input (ViewModel).
- Nessuna animazione non deterministica; nessuna dipendenza da tempo o random.
- Stesso ViewModel → stesso albero di widget.

## Ruolo regolatorio della UI

- La presentazione è auditabile: struttura fissa (Header, SafetyBadge, DetailsSection).
- ViewModel immutabile e serializzabile; nessuna logica business in presentation.
- Explainability sempre presente e safety chiaramente visibile.

## Struttura implementata

- `viewmodels/explainability_view_model.dart` — title, summary, details, safetyLevel, timestampLabel (string).
- `components/` — ExplainabilityHeader, ExplainabilitySafetyBadge, ExplainabilityDetailsSection.
- `screens/explainability_screen.dart` — riceve ViewModel; layout: IrisSection > Header > Badge > Details.
- Router: route explainabilityPanel costruisce ViewModel da params e mostra ExplainabilityScreen.
