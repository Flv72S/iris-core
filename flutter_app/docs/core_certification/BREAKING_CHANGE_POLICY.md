# IRIS Deterministic Core — Breaking Change Policy

**FASE N — N16 Certification**  
**Status: Governance**

This document defines what constitutes a breaking change in the IRIS deterministic core and how such changes must be governed.

---

## Definition of breaking change

A **breaking change** is any modification that:

1. **Alters canonical serialization layout**  
   Changing the key set, key order, type tags, or encoding rules of `toCanonicalMap` / `CanonicalSerializer` such that the same logical state could produce different bytes, or existing bytes could be interpreted differently.

2. **Changes hash computation semantics**  
   Changing the hash algorithm (e.g. FNV-1a constants or steps), the input to the hash (e.g. adding or removing fields from the chain hash map), or the semantics of `deterministicHash` / `computeDeterministicHash`.

3. **Modifies transition purity assumptions**  
   Allowing transitions to perform IO, use randomness or time, or mutate shared state in a way that makes output depend on more than (current state, event).

4. **Changes protocolVersion compatibility rules**  
   Changing the rules of `isCompatibleWith` or `DeterministicSchemaGuard.validateSchemaCompatibility` (e.g. allowing newer minor to load, or changing major/minor semantics).

5. **Alters snapshot chain linking logic**  
   Changing how chainHash is computed or verified, or changing the genesis rule or link validation rules.

6. **Alters replay verification contract**  
   Changing what verifyAgainstLedger compares, or the conditions under which replay is considered equivalent to the original ledger.

7. **Alters entropy audit policy**  
   Allowing previously forbidden constructs (DateTime, Random, Platform, IO, etc.) inside the deterministic core without a new major version.

8. **Modifies ledger append-only invariant**  
   Allowing removal, reordering, or in-place modification of ledger snapshots, or changing append validation rules in a way that accepts previously invalid snapshots or rejects previously valid ones.

---

## Policy

**Breaking changes require a new major deterministic protocol version.**

- The current protocol version is 1.0 (DeterministicProtocolVersion.initial).
- A breaking change must be accompanied by a bump to the next major version (e.g. 2.0).
- Compatibility layer (N14) enforces that snapshots from a different major version are not loaded without an explicit compatibility strategy.
- No silent breaking changes; no backward-incompatible change without a major version increment and documentation.

---

## Non-breaking changes

The following are generally **not** breaking, provided they do not affect the contract surface above:

- Adding optional parameters with safe defaults.
- Adding new types or helpers outside the frozen contract surface.
- Documentation and comment updates.
- Test-only or development-only code (e.g. freeze guard, profiling) that does not affect core behavior.
- Bug fixes that restore guaranteed behavior without changing specified semantics.

When in doubt, treat any change that could alter replay output, hash output, or serialization output for the same inputs as breaking.

---

*Document: BREAKING_CHANGE_POLICY.md — N16 Certification*
