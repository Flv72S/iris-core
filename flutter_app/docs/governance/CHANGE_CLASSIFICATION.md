# IRIS Governance — Change Classification Protocol

Closed set of change classes; scope-aware; declarative. No automatic inference. Output is input for version bump (G1) and compatibility (G2).

---

## Change Classes (closed)

| Class | Description | Examples allowed | Examples forbidden | Version bump (G1) |
|-------|-------------|------------------|--------------------|-------------------|
| **NON_BREAKING** | Fix or internal change; no API/behavior change. | Bug fix, refactor, docs. | API signature change, removal. | PATCH |
| **BACKWARD_COMPATIBLE** | New capability; existing use remains valid. | New optional param, new endpoint. | Removing or renaming public surface. | MINOR |
| **SOFT_BREAK** | Deprecation or behavior change with migration path. | Deprecate + keep old behavior for N versions. | Silent behavior change. | MINOR (per policy) |
| **HARD_BREAK** | Incompatible change; consumers must adapt. | Remove API, change contract, behavioral hash change. | — | MAJOR |
| **CORE_BREAK** | Core evolution; structural or contract change. | New Core major; interface change. | Any change not via evolution protocol. | Core MAJOR only |

---

## Scope of application

| Scope | Allowed change types | Forbidden |
|-------|----------------------|-----------|
| **CORE** | `CORE_BREAK` only. | nonBreaking, backwardCompatible, softBreak, hardBreak (Core does not use them; any change is a break). |
| **FLOW** | nonBreaking, backwardCompatible, softBreak, hardBreak. | coreBreak (reserved for Core). |
| **PLUGIN** | nonBreaking, backwardCompatible, softBreak, hardBreak. | coreBreak. |

---

## Validation rules

- **CORE** + nonBreaking → invalid.  
- **CORE** + coreBreak → valid.  
- **FLOW** + backwardCompatible → valid.  
- **PLUGIN** + coreBreak → invalid.  
- Classifier only validates (type + scope); it does not infer or change the type.

---

## Relation to other steps

- **G1 (Versioning):** Change class and scope drive `computeNextVersion(current, changeType, scope)`.  
- **G2 (Compatibility):** Hard/Core breaks may require matrix updates.  
- **G4/G5:** Classification output is input for breaking-change declaration and gates.

---

*Document version: 1.0. Classification is declarative; no implicit class.*
