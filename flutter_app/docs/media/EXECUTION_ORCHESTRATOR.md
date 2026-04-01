# Execution Orchestrator

## Panoramica

L'**Execution Orchestrator** è un coordinatore puro che esegue sequenzialmente un `PhysicalOperationPlan` utilizzando un `MediaExecutionPort`. Il comportamento è completamente deterministico con stop-on-failure.

## Architettura

```
┌───────────────────────────────────────────────────────────────────┐
│                    MATERIALIZATION LAYER                          │
│                                                                   │
│  MediaLifecyclePlan ─────► MediaMaterializationEngine             │
│                                     │                             │
│                                     ▼                             │
│                         PhysicalOperationPlan                     │
└─────────────────────────────────────┬─────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                    EXECUTION LAYER (questo)                       │
│                                                                   │
│  PhysicalOperationPlan ─────► MediaExecutionOrchestrator          │
│                                     │                             │
│                        ┌────────────┴────────────┐                │
│                        │   per ogni operazione   │                │
│                        │   in ordine sequenza    │                │
│                        └────────────┬────────────┘                │
│                                     │                             │
│                                     ▼                             │
│                          MediaExecutionPort                       │
│                          (abstract - mock/real)                   │
│                                     │                             │
│                                     ▼                             │
│                          ExecutionResult                          │
│                                     │                             │
│                           ┌─────────┴─────────┐                   │
│                           │   success?        │                   │
│                           └─────────┬─────────┘                   │
│                          yes        │        no                   │
│                           │         │         │                   │
│                      continua    skipped    STOP                  │
│                           │         │         │                   │
│                           └────┬────┘         │                   │
│                                │              │                   │
│                                ▼              ▼                   │
│                         ExecutionTrace ◄──────┘                   │
└───────────────────────────────────────────────────────────────────┘
```

## Perché "Pure Coordinator"

L'orchestrator è definito "puro" perché:

1. **Non prende decisioni**: esegue operazioni nell'ordine dato
2. **Non modifica dati**: non altera operazioni o risultati
3. **Non ha stato**: ogni esecuzione è indipendente
4. **Non ha side-effect**: solo input → output
5. **Deterministico**: stesso input → stesso output

### Cosa NON fa

| Funzionalità | Motivo |
|--------------|--------|
| Retry | Richiede policy esterne |
| Backoff | Richiede timing/clock |
| Compensazione | Richiede logica di dominio |
| Rollback | Richiede conoscenza operazioni inverse |
| Logging | Richiede infrastruttura |
| Concorrenza | Introduce non-determinismo |

## Comportamento Stop-on-Failure

```
Operazioni: [op0, op1, op2, op3]

Scenario 1: Tutto OK
  op0 → success ✓
  op1 → success ✓
  op2 → success ✓
  op3 → success ✓
  Trace: [success, success, success, success]

Scenario 2: Failure su op1
  op0 → success ✓
  op1 → failure ✗ ─── STOP
  op2 → (non eseguito)
  op3 → (non eseguito)
  Trace: [success, failure]

Scenario 3: Skipped continua
  op0 → success ✓
  op1 → skipped ○ ─── continua
  op2 → success ✓
  Trace: [success, skipped, success]
```

## Componenti

### ExecutionTrace

Registra l'esecuzione completa:

```dart
class ExecutionTrace {
  final PhysicalOperationPlan plan;
  final List<ExecutionResult> results;  // immutabile
  
  bool get allSucceeded;   // tutti success?
  bool get hasFailed;      // almeno un failure?
  bool get isComplete;     // tutte eseguite?
  int get executedCount;   // quante eseguite
  int get plannedCount;    // quante pianificate
  ExecutionResult? get firstFailure;
}
```

### MediaExecutionOrchestrator

Coordinatore puro:

```dart
class MediaExecutionOrchestrator {
  Future<ExecutionTrace> executePlan(
    PhysicalOperationPlan plan,
    MediaExecutionPort port,
  );
}
```

## Esempio di utilizzo

```dart
// Creare il piano (da layer precedenti)
final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);
final opPlan = materializationEngine.buildOperationPlan(
  lifecyclePlan,
  mediaId: media.hash,
);

// Eseguire con un port (mock per test, reale per produzione)
final orchestrator = MediaExecutionOrchestrator();
final trace = await orchestrator.executePlan(opPlan, mockPort);

// Verificare risultato
if (trace.allSucceeded) {
  // Tutte le operazioni completate
} else if (trace.hasFailed) {
  final failure = trace.firstFailure;
  // Gestire errore
}
```

## Test coverage

| Test | Verifica |
|------|----------|
| Sequential execution | Operazioni in ordine corretto |
| Stop on failure | Interruzione immediata |
| Full success | allSucceeded == true |
| Determinism | Stesso input → stesso output |
| Empty plan | Trace vuoto valido |
| Skipped handling | Continua dopo skipped |

## Vincoli architetturali

### L'orchestrator NON:

- Modifica PhysicalOperation
- Interpreta ExecutionFailure
- Consulta Lifecycle
- Legge policy
- Crea nuove operazioni
- Introduce branching creativo

### L'orchestrator È:

- Puro coordinatore
- Sequenziale
- Deterministico
- Stop-on-failure

## Prossimi passi

Con l'orchestrator completato, il ciclo astratto è chiuso:

```
Lifecycle → Materialization → Port → Orchestrator → Trace
```

I prossimi microstep implementeranno adapter concreti:
- I4: Local Storage Adapter
- I5: Cloud Storage Adapter
- I6: Cold Archive Adapter
