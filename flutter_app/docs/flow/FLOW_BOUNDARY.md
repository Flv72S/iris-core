# IRIS Flow Boundary

## Core vs Flow

- **IRIS Core** is frozen, hashed, certifiable, and immutable. It includes structural hash, freeze seal, certification manifest, evidence index, and all Phase 13–14 artifacts. Core does not change at runtime.
- **IRIS Flow** is the evolving runtime and UX layer. It orchestrates interaction, UI, and application state. Flow may change between releases.

The boundary is the formal, technical separation between the two. Flow may read from Core only through the defined contract. Core must not depend on Flow.

## Dependency direction

- **Allowed:** Flow → Core (read-only via `flow_core_contract.dart`).
- **Forbidden:** Core → Flow. No Core module may import or depend on Flow.
- **Forbidden:** Flow importing Core internals (e.g. `core_freeze`, certification generators, builders). Flow may only use the read-only contract surface.

## Correct interaction

1. Flow obtains an implementation of `IFlowCoreContract` (e.g. via dependency injection or a single adapter).
2. Flow calls `structuralHashReader.readStructuralHash()` to get a `StructuralHashSnapshot`.
3. Flow calls `trustStateReader.readTrustState()` to get a `TrustStateSnapshot`.
4. Flow calls `certificationContextReader.readCertificationContext()` to get a `CertificationContextSnapshot`.
5. Flow uses these immutable snapshots for display or logic. Flow does not write, update, or invalidate any Core data.

## Violation examples

- Flow (or any non-boundary code under `lib/ui`) importing `package:iris_flutter_app/core_freeze` or internal `package:iris_flutter_app/certification/*` modules (e.g. generators, builders).
- Flow calling any method that mutates Core state (setters, write APIs, recalc, rebuild).
- Core importing anything from `lib/ui` or Flow-specific packages.
- Flow inferring or displaying normative claims (e.g. “certified”, “compliant”) beyond what the contract exposes as raw data.

## Architectural rationale

- **Structural regression:** Any change to Core is detectable via structural hash. Flow cannot alter that hash.
- **Single responsibility:** Core remains a fixed verification surface; Flow remains the variable UX and orchestration layer.
- **Testability:** Boundary rules and forbidden operations are enumerated so that automated tests can detect inverse dependencies and mutative use.

## Consequences of a violation

- **Inverse dependency (Core → Flow):** Core would no longer be immutable or independently deployable; certification artifacts could be invalidated.
- **Flow importing Core internals:** Flow could accidentally call mutative or internal APIs, or couple to Core implementation details.
- **Mutative call from Flow:** Core state could change, breaking hash stability and external verification.

All boundary rules and forbidden operations are defined in code under `lib/flow_boundary/` and enforced by tests under `test/flow_boundary/`.
