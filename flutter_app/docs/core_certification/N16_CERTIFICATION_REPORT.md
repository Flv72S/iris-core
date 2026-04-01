# IRIS FASE N — Deterministic Core Certification Report

**N16 — Formal Deterministic Contract Lock**

---

## Certification declaration

**FASE N — Deterministic Core Baseline**

| Attribute | Value |
|-----------|--------|
| **Status** | Certified, Hardened, Freeze declared |
| **Version** | 1.0.0-freeze |
| **Freeze timestamp** | 2026-02-08 (informational only; not used in deterministic runtime logic) |

---

## Certification version

- **Version:** 1.0.0-freeze  
- **Scope:** IRIS deterministic core (lib/core/deterministic/).  
- **Governance:** docs/core_certification/ and DeterministicCoreFreezeGuard.

---

## Freeze timestamp (informational only)

The freeze date is documented here for audit and governance only. It must **not** be read, computed, or used inside deterministic runtime logic. No timestamp or date influences state, hash, or replay.

---

## Verified invariant list

1. **DeterministicStateEngine** — Sequential application; no mutable state escape.  
2. **TransitionFunction** — Pure (state, event) → new state; no side effects.  
3. **StateSnapshot** — Canonical serialization and equality include protocolVersion.  
4. **ChainHash** — FNV-1a variant; genesis and link rules fixed.  
5. **ReplayEngine** — Same inputs → identical ledger; verifyAgainstLedger enforces.  
6. **Ledger** — Append-only; chain verification on append.  
7. **ProtocolVersion** — Binding in chain and snapshot; compatibility rules fixed.  
8. **Entropy** — No DateTime, Random, Platform, IO, async in core.

---

## Entropy audit status

- **Status:** Enforced.  
- **Mechanism:** Scan of lib/core/deterministic for forbidden constructs (DateTime, Random, Platform, etc.).  
- **Tests:** Entropy audit tests verify absence of such constructs and fail if introduced.

---

## Stress test status

- **Status:** Passed.  
- **Coverage:** High-volume transitions (e.g. 10k events), replay equivalence, verifyFullChain under load, multi-run determinism, snapshot immutability, byte stability.  
- **Location:** test/core/deterministic/stress_tests/.

---

## Replay verification status

- **Status:** Passed.  
- **Behavior:** Replay produces ledger identical to engine for same events; verifyAgainstLedger compares length, stateHash, chainHash, stateVersion, transitionIndex.  
- **Tests:** test/core/deterministic/replay_engine_test.dart and related.

---

## Protocol compatibility status

- **Status:** Enforced.  
- **Behavior:** Protocol version on snapshots; incompatible version load throws CompatibilityViolation; replay and load validate version before use.  
- **Tests:** test/core/deterministic/compatibility_tests/protocol_compatibility_test.dart.

---

## Summary

The deterministic core is architecturally stable, protocol-level defined, and breaking-change protected. Future changes that affect the contract surface or guarantees require a new major deterministic protocol version as per BREAKING_CHANGE_POLICY.md.

---

*N16_CERTIFICATION_REPORT.md — 1.0.0-freeze — FASE N closure*
