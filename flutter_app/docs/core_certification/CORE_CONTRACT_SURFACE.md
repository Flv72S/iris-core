# IRIS Deterministic Core — Contract Surface Freeze

**FASE N — N16 Certification**  
**Status: Frozen**

This document declares the frozen contract surface of the IRIS deterministic core.

---

## Frozen Components

### 1. DeterministicStateEngine behavior

- Applies transitions sequentially in event order.
- Rejects duplicate or out-of-order event indices.
- Produces one snapshot per applied event.
- Does not expose mutable state.

**Modifications to these behaviors require major protocol version increment.**

### 2. TransitionFunction contract

- Type: `S Function(S state, E event)` (DeterministicTransition).
- Pure function: same (state, event) yields same new state.
- No side effects, no IO, no randomness, no time dependence.

**Modifications to this contract require major protocol version increment.**

### 3. StateSnapshot canonical serialization

- Snapshot identity: state (toCanonicalMap), stateHash, stateVersion, transitionIndex, chainHash, protocolVersion.
- State canonical form: sorted keys, canonical encoding of types.
- Snapshot equality and hashCode include protocolVersion.

**Modifications to canonical serialization or snapshot structure require major protocol version increment.**

### 4. ChainHash algorithm

- Algorithm: 32-bit FNV-1a variant (offset 0x811c9dc5, prime 0x01000193).
- Input: canonical bytes of map with previousChainHash, protocolVersionMajor, protocolVersionMinor, stateHash, stateVersion, transitionIndex.
- Genesis: transitionIndex 0 with previousChainHash 0.

**Modifications to hash algorithm or input structure require major protocol version increment.**

### 5. ReplayEngine equivalence rule

- Same event sequence from same initial state produces identical ledger (length, stateHash, chainHash, stateVersion, transitionIndex per index).
- verifyAgainstLedger enforces this; protocol version checked before replay.

**Modifications to replay semantics require major protocol version increment.**

### 6. Ledger append-only invariant

- Ledger is append-only; no removal or reordering.
- Genesis and each append validate chainHash.

**Modifications to append semantics require major protocol version increment.**

### 7. ProtocolVersion binding rule

- Each snapshot carries DeterministicProtocolVersion (major, minor).
- Version in chain hash and snapshot equality/hashCode.
- Same major required; loading newer minor throws CompatibilityViolation.

**Modifications to version rules require major protocol version increment.**

### 8. Entropy audit enforcement

- Core must not use: DateTime, Random, Platform, IO, async, UUID.
- Entropy audit enforces absence of forbidden constructs.

**Modifications to entropy policy require major protocol version increment.**

---

## Freeze declaration

**Modifications to the components listed above require major deterministic protocol version increment.**

---

*CORE_CONTRACT_SURFACE.md — N16 Certification*
