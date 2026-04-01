# Phase 11.1.3 — Navigation & Screen Topology

## Grafo statico delle schermate

| Route | Screen | Parametri |
|-------|--------|-----------|
| home | HomeScreen | — |
| decisionDetail | DecisionDetailScreen | DecisionDetailParams (traceId) |
| explainabilityPanel | ExplainabilityPanelScreen | ExplainabilityParams (explanationId, traceId) |
| history | HistoryScreen | — |
| settingsMode | SettingsModeScreen | — |

**Direzione**: da Home è possibile navigare a tutte le altre schermate. Nessun redirect implicito; nessuna condizione runtime per l’accesso.

## Regole di determinismo del routing

- Stessa route name + stessi parametri → stessa schermata.
- Nessuna generazione dinamica delle route (nomi in `IrisRoutes` fissi).
- `IrisRouter.onGenerateRoute` è una mappa pura: `RouteSettings` → `MaterialPageRoute`; nessuna logica decisionale, nessun side-effect.

## Accessibilità explainability

- **ExplainabilityPanel** è una route dedicata (`explainabilityPanel`), sempre raggiungibile da Home.
- Nessuna condizione che nasconda Safety, Mode, Outcome o Trace; la navigazione non sostituisce né nasconde il contenuto explainability.

## Compatibilità con audit replay

- **Route names**: stringhe stabili e versionabili (`home`, `decisionDetail`, `explainabilityPanel`, `history`, `settingsMode`).
- **Parametri**: `DecisionDetailParams` e `ExplainabilityParams` sono immutabili, con uguaglianza deterministica e campi serializzabili (String).
- Dato un audit log con (route, params), la sequenza di schermate è ricostruibile in modo deterministico.

## Allineamento Certification Gates

- **Gate A — Determinismo UI**: PASS (routing statico, stessa route → stessa screen).
- **Gate B — Explainability Integrity**: PASS (panel sempre raggiungibile, nessuna condizione nascosta).
- **Gate C — Audit Replay**: PASS (route e parametri serializzabili, sequenza ricostruibile).

## File implementati

- `lib/presentation/navigation/iris_routes.dart` — Nomi route statici.
- `lib/presentation/navigation/iris_router.dart` — Mapping route → screen.
- `lib/presentation/navigation/route_params.dart` — DecisionDetailParams, ExplainabilityParams.
- `lib/presentation/screens/` — HomeScreen, DecisionDetailScreen, ExplainabilityPanelScreen, HistoryScreen, SettingsModeScreen.
- `test/navigation/routing_determinism_test.dart` — Determinismo e stabilità route.
