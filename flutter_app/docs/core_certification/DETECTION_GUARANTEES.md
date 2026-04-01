# IRIS Deterministic Core — Detection Guarantees

**FASE N — N16 Certification**  
**Status: Architectural contract commitments**

Formally guaranteed properties of the IRIS deterministic core.

---

## Guaranteed properties

### 1. Time independence

- Core does not use system time or date/time APIs.
- State and hashes do not depend on when execution occurs.

### 2. Randomness independence

- Core does not use random number generators or probabilistic APIs.
- Same inputs always produce the same outputs.

### 3. Platform independence

- Core does not depend on platform-specific APIs.
- Hash and serialization behavior identical across supported platforms.

### 4. IO independence inside deterministic core

- Core does not perform file, network, or other IO.
- Persistence is outside the core; core operates on in-memory state and events only.

### 5. Replay equivalence

- Same initial state and same ordered events yield identical ledger.
- verifyAgainstLedger asserts exact match of stateHash, chainHash, stateVersion, transitionIndex.

### 6. ChainHash monotonic integrity

- Each chainHash derived from previous and current snapshot fields.
- Verification detects tampering or reordering.

### 7. Snapshot immutability

- StateSnapshot instances are immutable.
- No mutable escape of internal state.

### 8. Ledger append-only structure

- Ledger accepts only appends; no deletion or in-place modification.
- Exposed snapshot list is unmodifiable.

---

## Contract commitment

**These guarantees are architectural contract commitments.**

Violations are breaking changes and require a new major deterministic protocol version per Breaking Change Policy.

---

*DETECTION_GUARANTEES.md — N16 Certification*
