# Phase 7.V — Test Infrastructure (Deterministic, Replayable, Certifiable)

## Scopo

Costruire un **banco prova completo** per Phase 7 (Execution Runtime, Guardrails, Kill-Switch, Audit) che garantisca:

- **Riproducibilità assoluta** — input statici, timestamp simulati, nessuna fonte random.
- **Isolamento dei domini** — inbox, tasks, calendar, focus; nessuna contaminazione.
- **Replay post-mortem** — riesecuzione di qualsiasi ActionIntent e verifica di coerenza con il run originale.
- **Verificabilità** di guardrail e kill-switch.
- **Base formale** per Phase 7 Certification.

Questa fase **non esegue** i test di certificazione; prepara l’infrastruttura su cui verranno eseguiti.

---

## Struttura

```
tests/phase-7/
├── fixtures/
│   ├── resolution-states/   # RESOLVED_ALLOWED, BLOCKED, FORCED, SUSPENDED
│   ├── action-intents/      # Intent per dominio (inbox, tasks, calendar, focus)
│   ├── guardrail-scenarios/  # max-actions, cooldown, abort (system/user)
│   └── kill-switch-scenarios/# global-off, feature-off, action-type-off
├── harness/
│   ├── execution-harness.ts # Run Resolution + Intent → result + audit snapshot
│   ├── replay-engine.ts     # Replay + confronto original vs replay
│   └── determinism-checker.ts # N run identici, fallisce se divergenza
├── runners/
│   ├── run-all-phase7-tests.ts   # Domini + kill-switch + replay
│   └── run-determinism-suite.ts  # Suite determinismo
├── audit-snapshots/         # Snapshot audit (vedi README interno)
└── README.md
```

---

## Come eseguire i runner

### Run all Phase 7 tests

Esegue domini, kill-switch e replay; restituisce passed/failed.

```bash
npx ts-node tests/phase-7/runners/run-all-phase7-tests.ts
```

Oppure da modulo:

```ts
import { runAllPhase7Tests } from './runners/run-all-phase7-tests';
const { passed, failed, results } = runAllPhase7Tests();
```

### Determinism suite

Esegue più run identici per ogni intent e verifica che gli output coincidano.

```bash
npx ts-node tests/phase-7/runners/run-determinism-suite.ts
```

Oppure:

```ts
import { runDeterminismSuite } from './runners/run-determinism-suite';
const report = runDeterminismSuite(5);
// report.identical === report.total ⇒ nessuna divergenza
```

---

## Garanzie di determinismo

- **Input statici:** tutte le fixture hanno timestamp ISO fissi (es. `2025-01-15T10:00:00.000Z`) e payload fissi.
- **Timestamp simulati:** l’harness accetta `nowMs`; i runner usano un `FIXED_NOW` derivato dalla fixture.
- **Nessun random:** nessuna chiamata a `Math.random()` o generatori casuali nell’infrastruttura.
- **Stesso input → stesso output:** il determinism checker esegue N run con lo stesso input e fallisce se almeno un run diverge (status, executedAt, lunghezza audit).

---

## Relazione con Phase 7 Certification

- L’infrastruttura 7.V è il **banco prova** su cui verrà eseguita la Phase 7 Certification.
- I criteri di completamento 7.V:
  - tutti i runner eseguono senza errori;
  - replay engine restituisce `identical: true` per i casi attesi;
  - determinism suite non rileva divergenze;
  - audit snapshot sono generati correttamente dall’harness.

---

## Vincoli

- **Nessuna logica LLM** nell’infrastruttura.
- **Nessuna modifica** all’Execution Runtime (solo uso delle API pubbliche).
- **Nessuna anticipazione** di Phase 8 (Feedback Loop).
