# Media Materialization Layer

## Panoramica

Il **Media Materialization Layer** traduce un `MediaLifecyclePlan` in un `PhysicalOperationPlan`. Questo layer è puramente derivativo e deterministico: non esegue operazioni, non prende decisioni autonome, non accede a risorse esterne.

## Separazione architetturale

```
┌───────────────────────────────────────────────────────────────────┐
│                         FASE G                                    │
│                 Media Governance Extension                        │
│  - MediaStoragePolicy                                             │
│  - UserTierBinding                                                │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                         FASE H                                    │
│                 Meta-Governance Snapshot                          │
│  - activeMediaPolicyIds                                           │
│  - activeTierBindings                                             │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                         FASE F                                    │
│                 Media Enforcement Layer                           │
│  - MediaReference                                                 │
│  - MediaEnforcementDecision                                       │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                    MEDIA LIFECYCLE                                │
│  - MediaLifecycleState                                            │
│  - MediaLifecycleTransition                                       │
│  - MediaLifecyclePlan                                             │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│              MEDIA MATERIALIZATION (questo layer)                 │
│  - PhysicalOperationType                                          │
│  - PhysicalOperation                                              │
│  - PhysicalOperationPlan                                          │
└───────────────────────────────────────────────────────────────────┘
```

## Componenti

### PhysicalOperationType

Enum delle operazioni fisiche:

| Tipo | Descrizione |
|------|-------------|
| `storeLocal` | Salvataggio su storage locale |
| `uploadCloud` | Upload su cloud storage |
| `archiveCold` | Archiviazione su cold storage |
| `delete` | Cancellazione |

### PhysicalOperation

Value object immutabile per una singola operazione:

```dart
class PhysicalOperation {
  final String mediaId;
  final PhysicalOperationType type;
  final String targetTier;    // "local", "cloud", "archive", "none"
  final int sequenceOrder;
}
```

### PhysicalOperationPlan

Piano ordinato di operazioni:

```dart
class PhysicalOperationPlan {
  final List<PhysicalOperation> operations;  // immutabile, ordinato
  
  bool get hasCloudOperations;
  bool get hasArchiveOperations;
  bool get hasDeleteOperations;
}
```

### MediaMaterializationEngine

Traduce lifecycle in operazioni fisiche:

```dart
class MediaMaterializationEngine {
  PhysicalOperationPlan buildOperationPlan(
    MediaLifecyclePlan lifecyclePlan, {
    required String mediaId,
  });
}
```

## Regole di traduzione

La traduzione è puramente meccanica:

| Lifecycle State | Physical Operation |
|-----------------|-------------------|
| `localOnly` | `storeLocal` |
| `syncing` | `uploadCloud` |
| `cloudStored` | (nessuna, già coperto da syncing) |
| `coldArchived` | `archiveCold` |
| `pendingDeletion` | (stato logico) |
| `deleted` | `delete` |
| `captured` | (stato iniziale) |

## Esempio completo

### Input: MediaLifecyclePlan (cloud con archive)

```dart
MediaLifecyclePlan(
  initial: captured,
  transitions: [
    captured → localOnly (localPersisted),
    localOnly → syncing (syncStarted),
    syncing → cloudStored (uploadSucceeded),
    cloudStored → coldArchived (archiveCompleted),
    coldArchived → pendingDeletion (retentionExpired),
    pendingDeletion → deleted (deletionCompleted),
  ]
)
```

### Output: PhysicalOperationPlan

```dart
PhysicalOperationPlan(
  operations: [
    PhysicalOperation(mediaId: "abc", type: storeLocal, tier: "local", seq: 0),
    PhysicalOperation(mediaId: "abc", type: uploadCloud, tier: "cloud", seq: 1),
    PhysicalOperation(mediaId: "abc", type: archiveCold, tier: "archive", seq: 2),
    PhysicalOperation(mediaId: "abc", type: delete, tier: "none", seq: 3),
  ]
)
```

### Esempio local-only

```dart
// Input: lifecycle senza cloud
MediaLifecyclePlan(
  transitions: [captured → localOnly → pendingDeletion → deleted]
)

// Output
PhysicalOperationPlan(
  operations: [
    PhysicalOperation(type: storeLocal, tier: "local", seq: 0),
    PhysicalOperation(type: delete, tier: "none", seq: 1),
  ]
)
```

## Vincoli architetturali

### Divieti assoluti

- **NO** modifiche a G, H, F, Lifecycle
- **NO** import di dart:io
- **NO** DateTime, Random, Timer
- **NO** riferimenti a provider (AWS, GCS, Azure)
- **NO** decisioni autonome
- **NO** logica di enforcement

### Garanzie

- **Determinismo**: stesso lifecycle → stesso plan
- **Provider-agnostic**: nessun riferimento vendor
- **Immutabilità**: operazioni e piani immutabili
- **Ordinamento**: operazioni sempre in sequenza

## Test coverage

| Test | Verifica |
|------|----------|
| Determinism | Stesso input → stesso output |
| Local-only | Solo storeLocal + delete |
| Cloud | Include uploadCloud |
| Archive | Include archiveCold |
| Delete | Tutti i piani terminano con delete |
| No duplicates | Nessuna operazione duplicata |
| Forbidden guard | Nessun pattern vietato |

## Prossimi passi

Questo layer descrive **cosa deve essere fatto**. L'esecuzione effettiva sarà implementata nei microstep successivi della FASE I:

```
I1 (questo) — Materialization Adapter Layer
     │
     ▼
I2 — Local Storage Executor
     │
     ▼
I3 — Cloud Storage Executor
     │
     ▼
I4 — Cold Archive Executor
```
