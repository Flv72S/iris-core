# Phase 11.1.1 — Bootstrap Verification

## Dependency Isolation Verification

| Check | Metodo | Esito |
|-------|--------|--------|
| Assenza import vietati | Verifica che nessun file in `presentation/` importi da `infra/` o da core IRIS. Nessun file in `domain/` importi da `infra/` o `presentation/`. | Manuale / grep |
| Assenza business logic | Nessuna policy, safety rule, explainability generation, classificazione o inferenza in `lib/`. | Manuale / review |
| Rispetto Clean Architecture | presentation → domain → bridge → infra; nessun arco inverso o cross-layer vietato. | Manuale / diagramma dipendenze |

## Static Analysis

| Comando | Requisito |
|---------|-----------|
| `flutter analyze` | ERRORS: 0, CRITICAL WARNINGS: 0 |

## Build

| Comando | Requisito |
|---------|-----------|
| `flutter build apk` | Completamento con successo |
| `flutter build ios --no-codesign` | Completamento con successo |

## Esito certificazione bootstrap

| Criterio | PASS/FAIL |
|----------|-----------|
| Progetto Flutter avviabile | |
| Clean Architecture rispettata | |
| Zero logica decisionale | |
| Analyzer pulito | |
| Build Android riuscita | |
| Build iOS riuscita | |
| Documentazione Phase 11 creata | |
| Dependency isolation documentata | |

*Compilare Esito dopo esecuzione di flutter analyze e build.*
