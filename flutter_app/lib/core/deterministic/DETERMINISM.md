# Determinism — Architectural Law

State evolution is strictly deterministic:

**Sₙ₊₁ = T(Sₙ, Eₙ)**

---

## Invariants

- **State is pure data.** No hidden mutable fields. No references to non-deterministic resources.

- **Transition is a pure function.** Same (Sₙ, Eₙ) ⇒ same Sₙ₊₁. No I/O, no clock, no random, no side effects.

- **Replay produces identical hash.** Replaying the same event sequence from the same initial state must yield the same final state hash.

- **No entropy.** No `DateTime`, `Random`, UUID v4, platform channels, network, or any API that varies by time or environment.

- **EventIndex monotonic.** Event indices never decrease along a stream. No gaps in sequence for a given source.

- **StateVersion monotonic.** State version increases with each transition. No rollback of version.

- **Snapshot chain hash cumulative.** Each snapshot hash depends on the previous snapshot hash and the applied transition. Chain is verifiable.

---

## Forbidden

- DateTime.now() or any clock-based API  
- Random() or any random source  
- UUID v4 or non-deterministic identifiers  
- IO read/write  
- Network calls  
- Platform channels  
- Async race conditions  
- Non-ordered map serialization  

Violations must be rejected (e.g. `DeterministicViolation`).
