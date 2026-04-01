# E2E Deterministic Flow Test

## Overview

The E2E Deterministic Flow Test validates the complete media processing pipeline from input to execution trace. This test ensures that the entire flow is:

- **Deterministic**: Same inputs always produce identical outputs
- **Reproducible**: Tests can be run locally without external dependencies
- **Infrastructure-free**: No filesystem, cloud SDK, or network access required

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           E2E DETERMINISTIC FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐     ┌──────────────────┐
    │  MediaReference  │     │    UserTier      │
    │  (hash, size,    │     │  (FREE/PRO/ENT)  │
    │   mime, policy)  │     │                  │
    └────────┬─────────┘     └────────┬─────────┘
             │                        │
             └───────────┬────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                     FASE F — Media Enforcement Layer                    │
    │  ┌─────────────────────────────────────────────────────────────────┐   │
    │  │ GovernanceSnapshot (H6) → MediaPolicyReader → EnforcementAdapter │   │
    │  └─────────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
               ┌──────────────────────┐
               │ MediaEnforcement     │
               │ Decision             │
               │ (uploadAllowed,      │
               │  localOnly,          │
               │  cloudAllowed,       │
               │  coldArchiveAllowed) │
               └──────────┬───────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                   Media Lifecycle Architecture                          │
    │  ┌─────────────────────────────────────────────────────────────────┐   │
    │  │      MediaLifecycleEngine.buildPlan(media, decision)            │   │
    │  └─────────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ MediaLifecyclePlan   │
               │ (initial state,      │
               │  transitions[])      │
               └──────────┬───────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │              FASE I1 — Materialization Adapter Layer                    │
    │  ┌─────────────────────────────────────────────────────────────────┐   │
    │  │   MediaMaterializationEngine.buildOperationPlan(lifecycle)      │   │
    │  └─────────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ PhysicalOperationPlan│
               │ (operations[]:       │
               │  storeLocal,         │
               │  uploadCloud,        │
               │  archiveCold,        │
               │  delete)             │
               └──────────┬───────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │               FASE I3 — Execution Orchestrator                          │
    │  ┌─────────────────────────────────────────────────────────────────┐   │
    │  │      MediaExecutionOrchestrator.executePlan(plan, port)         │   │
    │  └─────────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │              FASE I4 — Simulated Execution Adapter                      │
    │  ┌─────────────────────────────────────────────────────────────────┐   │
    │  │     SimulatedExecutionAdapter (deterministic test provider)     │   │
    │  └─────────────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │   ExecutionTrace     │
               │   (plan, results[])  │
               │   + Snapshot         │
               └──────────────────────┘
```

## Components

### Input Layer

| Component | Description |
|-----------|-------------|
| `MediaReference` | Immutable value object representing a media asset (hash, size, mime, policyId, location) |
| `UserTier` | Enum: FREE, PRO, ENTERPRISE |
| `GovernanceSnapshot` | H6-compliant immutable snapshot containing `activeMediaPolicyIds` and `activeTierBindings` |

### Processing Layers

| Layer | Responsibility |
|-------|---------------|
| **MediaEnforcementAdapter** | Translates MediaReference + UserTier into MediaEnforcementDecision |
| **MediaLifecycleEngine** | Builds lifecycle plan from enforcement decision |
| **MediaMaterializationEngine** | Converts lifecycle plan to physical operation plan |
| **MediaExecutionOrchestrator** | Executes operations via MediaExecutionPort |
| **SimulatedExecutionAdapter** | Test provider for deterministic execution simulation |

### Output Layer

| Component | Description |
|-----------|-------------|
| `ExecutionTrace` | Immutable record of executed operations and their results |
| `ExecutionResult` | Success/failure/skipped status for each operation |

## Test Coverage

### 1. Basic Success Flow

Tests the complete pipeline with valid inputs:
- Free tier: local-only storage
- Pro tier: cloud-enabled storage

### 2. Controlled Failure

Tests stop-on-failure behavior:
- Configurable failure on specific sequence orders
- File size limit enforcement

### 3. Multi-tier Testing

Validates tier-specific behavior:
- FREE: localOnly=true, cloudAllowed=false
- PRO: cloudAllowed=true, coldArchiveAllowed=false
- ENTERPRISE: cloudAllowed=true, coldArchiveAllowed=true

### 4. Determinism

Verifies reproducibility:
- Same input → identical decision, lifecycle, plan, trace
- Snapshot ordering is deterministic

### 5. Immutability

Ensures no mutation is possible:
- Snapshot lists are unmodifiable
- Execution trace results are unmodifiable

### 6. H6 Coherence

Validates snapshot integrity:
- All required media governance fields present
- Tier bindings correctly sorted
- Policy reader correctly resolves data

### 7. Forbidden Guard

Static analysis of source files:
- No `dart:io` imports
- No `DateTime.now`, `Random`, `File`, `Directory`
- No cloud SDK references (AWS, GCP, Azure, Firebase)
- No filesystem paths
- No HTTP/Dio imports
- No normative language in enforcement layer

## Determinism Guarantee

The E2E flow guarantees determinism through:

1. **Immutable Inputs**: All value objects are const-constructible
2. **Pure Functions**: No side effects in any processing layer
3. **No External State**: No filesystem, network, or clock access
4. **Deterministic Ordering**: Lists are sorted before comparison
5. **Stable Hash**: Same logical state → same hashCode

## Example Flow

```dart
// 1. Create governance snapshot
final snapshot = GovernanceSnapshotBuilder.build(
  activation: activation,
  gcpRegistry: GCPRegistry(),
  decisionRegistry: decisionRegistry,
  activePolicies: {},
  activeMediaPolicyIds: ['MEDIA_PRO_V1'],
  activeTierBindings: [
    UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1'),
  ],
);

// 2. Create media reference
const media = MediaReference(
  hash: 'sha256:abc123',
  sizeBytes: 50 * 1024 * 1024,
  mimeType: 'video/mp4',
  mediaPolicyId: 'MEDIA_PRO_V1',
  location: PhysicalLocation.localDevice,
);

// 3. Evaluate enforcement decision
final adapter = MediaEnforcementAdapter(
  policyReader: MediaPolicyReader(snapshot),
  policyLookup: policyLookup,
);
final decision = adapter.evaluate(media: media, userTier: UserTier.pro);

// 4. Build lifecycle plan
final lifecyclePlan = lifecycleEngine.buildPlan(media, decision);

// 5. Build operation plan
final opPlan = materializationEngine.buildOperationPlan(
  lifecyclePlan,
  mediaId: media.hash,
);

// 6. Execute with simulated adapter
const execAdapter = SimulatedExecutionAdapter.allSuccess();
final trace = await orchestrator.executePlan(opPlan, execAdapter);

// 7. Verify results
expect(trace.allSucceeded, isTrue);
expect(trace.isComplete, isTrue);
```

## Architectural Constraints

| Constraint | Enforcement |
|------------|-------------|
| No IO | Forbidden guard test |
| No randomness | Forbidden guard test |
| No timestamps | Forbidden guard test |
| No cloud SDK | Forbidden guard test |
| No normative language | Forbidden guard test |
| Immutability | Runtime `throwsUnsupportedError` tests |
| Determinism | Equality and hashCode comparison tests |

## Related Documentation

- [MEDIA_LIFECYCLE_ARCHITECTURE.md](./MEDIA_LIFECYCLE_ARCHITECTURE.md)
- [MEDIA_MATERIALIZATION_LAYER.md](./MEDIA_MATERIALIZATION_LAYER.md)
- [EXECUTION_CONTRACT_LAYER.md](./EXECUTION_CONTRACT_LAYER.md)
- [EXECUTION_ORCHESTRATOR.md](./EXECUTION_ORCHESTRATOR.md)
- [EXECUTION_SIMULATION_ADAPTER.md](./EXECUTION_SIMULATION_ADAPTER.md)

## Conclusion

With I5 complete, the FASE I media system is:

- **Fully tested end-to-end** in deterministic mode
- **Safe for simulation** without real IO
- **Ready for physical materialization** in subsequent microsteps (I6/I7)
