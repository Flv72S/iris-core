# IRIS Governance — Breaking Change Declaration

No breaking change without explicit declaration. Enforcement is automatic.

---

## What is a breaking change

- **SOFT_BREAK**: Deprecation or behavior change with migration path.
- **HARD_BREAK**: Incompatible change; consumers must adapt; MAJOR (G1).
- **CORE_BREAK**: Core evolution; Core MAJOR only (G1).

NON_BREAKING and BACKWARD_COMPATIBLE do not require a declaration.

---

## When declaration is required

Required when the change is **softBreak**, **hardBreak**, or **coreBreak**. A matching **BreakingChangeDescriptor** must exist in the **BreakingChangeManifest**. Otherwise the guard throws and merge/release must fail.

---

## CORE_BREAK vs HARD_BREAK vs SOFT_BREAK

- **CORE_BREAK**: targetVersion must be X.0.0 (Core policy).
- **HARD_BREAK**: targetVersion is the new MAJOR (or next SemVer).
- **SOFT_BREAK**: targetVersion is the release introducing the change (e.g. MINOR).

---

## Relation to G1 and G2

- **G1**: targetVersion must be consistent with version bump rules.
- **G2**: Hard/Core breaks typically require compatibility matrix updates (separate step).

---

*Document version: 1.0.*
