# Execution Simulation Adapter

## Panoramica

Il **SimulatedExecutionAdapter** è un'implementazione concreta di `MediaExecutionPort` progettata per test deterministici. Non è un mock, ma un adapter simulato che permette di controllare completamente il comportamento dell'esecuzione.

## Architettura

```
┌───────────────────────────────────────────────────────────────────┐
│                    TEST / DEVELOPMENT                             │
│                                                                   │
│  PhysicalOperationPlan                                            │
│           │                                                       │
│           ▼                                                       │
│  MediaExecutionOrchestrator                                       │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │           SimulatedExecutionAdapter                         │  │
│  │           ══════════════════════════                        │  │
│  │                                                             │  │
│  │  Configurazione:                                            │  │
│  │  - failOnSequenceOrders: {2, 5}                             │  │
│  │  - failOnTypes: {uploadCloud}                               │  │
│  │                                                             │  │
│  │  Comportamento:                                             │  │
│  │  - seq in failOnSequenceOrders → FAILURE                    │  │
│  │  - type in failOnTypes → FAILURE                            │  │
│  │  - altrimenti → SUCCESS                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│           │                                                       │
│           ▼                                                       │
│  ExecutionResult (success/failure)                                │
│           │                                                       │
│           ▼                                                       │
│  ExecutionTrace                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Perché non è un Mock

| Mock | SimulatedExecutionAdapter |
|------|---------------------------|
| Verifica chiamate | Produce risultati |
| Richiede setup per ogni test | Configurazione dichiarativa |
| Comportamento ad-hoc | Regole deterministiche |
| Dipende da framework mock | Nessuna dipendenza |

L'adapter è un **componente concreto** che implementa regole di business simulate, non un sostituto per verificare interazioni.

## Configurazione

### Success totale

```dart
// Tutte le operazioni hanno successo
const adapter = SimulatedExecutionAdapter.allSuccess();
```

### Failure su sequence order

```dart
// Fallisce solo operazioni con sequenceOrder 2 o 5
const adapter = SimulatedExecutionAdapter.failOnSequence({2, 5});
```

### Failure su tipo operazione

```dart
// Fallisce solo operazioni uploadCloud
const adapter = SimulatedExecutionAdapter.failOnType({
  PhysicalOperationType.uploadCloud,
});
```

### Configurazione combinata

```dart
// Fallisce su seq 0 OPPURE tipo delete
const adapter = SimulatedExecutionAdapter(
  failOnSequenceOrders: {0},
  failOnTypes: {PhysicalOperationType.delete},
);
```

## Regole di precedenza

1. Se `failOnSequenceOrders` contiene `operation.sequenceOrder` → **FAILURE** (con messaggio `seq:N`)
2. Altrimenti, se `failOnTypes` contiene `operation.type` → **FAILURE** (con messaggio `type:X`)
3. Altrimenti → **SUCCESS**

## Determinismo

L'adapter è completamente deterministico:

```dart
const adapter = SimulatedExecutionAdapter.failOnSequence({1});

// Queste due chiamate producono risultati identici
final r1 = await adapter.execute(operation);
final r2 = await adapter.execute(operation);

assert(r1 == r2);  // true
assert(r1.hashCode == r2.hashCode);  // true
```

## Esempio di test end-to-end

```dart
test('orchestrator stops on failure', () async {
  // Configura adapter che fallisce su seq 1
  const adapter = SimulatedExecutionAdapter.failOnSequence({1});
  
  // Crea piano con 3 operazioni (seq 0, 1, 2)
  final plan = PhysicalOperationPlan(operations: [op0, op1, op2]);
  
  // Esegui
  const orchestrator = MediaExecutionOrchestrator();
  final trace = await orchestrator.executePlan(plan, adapter);
  
  // Verifica: solo 2 operazioni eseguite (0 success, 1 failure)
  expect(trace.executedCount, 2);
  expect(trace.results[0].isSuccess, isTrue);
  expect(trace.results[1].isFailure, isTrue);
  expect(trace.isComplete, isFalse);
});
```

## Vincoli architetturali

### L'adapter NON:

- Usa dart:io
- Usa DateTime, Random
- Introduce delay
- Ha stato mutabile
- Fa logging
- Implementa retry

### L'adapter È:

- Deterministico
- Stateless
- Configurabile
- Completamente controllabile

## Test coverage

| Test | Verifica |
|------|----------|
| Success mode | Tutte success senza config |
| Failure by seq | Fallisce solo su seq specificati |
| Failure by type | Fallisce solo su tipi specificati |
| Combined | Precedenza seq > type |
| Determinism | Stesso input → stesso output |
| No state leakage | Chiamate multiple indipendenti |
| Contract | Implementa MediaExecutionPort |

## Prossimi passi

Con il SimulatedExecutionAdapter, è possibile il primo test end-to-end completo:

```
Lifecycle → Materialization → Execution → Trace
```

Il prossimo microstep (I5) implementerà proprio questo test di integrazione.
