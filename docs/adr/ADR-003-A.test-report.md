# ADR-003.A Test Report (Enterprise / Audit-Grade)

## Scope

Verification suite implemented for ADR-003.A invariants across:

- unit boolean validation
- runtime integration
- determinism guarantees
- negative/failure behavior
- classification-aware execution (SN / RT / TS)

Test architecture created:

`iris-sim/src/observability/tests/`
- `invariants.unit.test.ts`
- `invariants.integration.test.ts`
- `invariants.determinism.test.ts`
- `invariants.negative.test.ts`
- `invariants.classification.test.ts`
- `invariants.nondeterministic.test.ts`
- `fixtures/snapshot.factory.ts`
- `fixtures/runtime.factory.ts`
- `fixtures/corrupted.snapshot.ts`

---

## Execution Summary

Command executed:

- `npm run build`
- `node --import ./dist/test/setup/bootstrap.js --test dist/observability/tests/invariants.*.test.js`

Baseline (before hardening):

- suites: **5**
- tests: **24**
- pass: **23**
- fail: **0**
- skipped: **1** (expected: `NON_DETERMINISTIC` classification path)

After hardening patch:

- suites: **5**
- tests: **51**
- pass: **50**
- fail: **0**
- skipped: **1** (expected: `NON_DETERMINISTIC` classification path)

After NON-DETERMINISTIC observability layer:

- suites: **6**
- tests: **56**
- pass: **56**
- fail: **0**
- skipped: **0**

Status: **PASS**

---

## Coverage by Invariant Class

| Class | Verification Mode | Coverage | Outcome |
|------|--------------------|----------|---------|
| `SN_DETERMINISTIC` | Unit + snapshot validation | INV-001, INV-004, INV-007, INV-011, INV-012, INV-013, INV-020 | PASS |
| `RT_DETERMINISTIC` | Integration runtime lifecycle | INV-002, INV-005, INV-008, INV-009, INV-010, INV-014, INV-015, INV-016, INV-017, INV-018, INV-019 | PASS |
| `TS_CONTROLLED` | Controlled + observational bounded checks | INV-003 | PASS |
| `NON_DETERMINISTIC` | Observational bounded validation (non-strict) | INV-006 | OBSERVED_VALID |

Per-invariant hardening depth (deterministic invariants):

| Invariant | Class | Test Count (direct/explicit) |
|-----------|-------|------------------------------|
| INV-001 | SN_DETERMINISTIC | 6 |
| INV-002 | SN_DETERMINISTIC | 1 |
| INV-003 | TS_CONTROLLED | 7 |
| INV-004 | SN_DETERMINISTIC | 2 |
| INV-005 | RT_DETERMINISTIC | 5 |
| INV-007 | SN_DETERMINISTIC | 3 |
| INV-008 | RT_DETERMINISTIC | 4 |
| INV-009 | RT_DETERMINISTIC | 3 |
| INV-010 | RT_DETERMINISTIC | 3 |
| INV-011 | SN_DETERMINISTIC | 2 |
| INV-012 | SN_DETERMINISTIC | 8 |
| INV-013 | SN_DETERMINISTIC | 2 |
| INV-014 | RT_DETERMINISTIC | 6 |
| INV-015 | RT_DETERMINISTIC | 2 |
| INV-016 | RT_DETERMINISTIC | 2 |
| INV-017 | RT_DETERMINISTIC | 2 |
| INV-018 | RT_DETERMINISTIC | 2 |
| INV-019 | RT_DETERMINISTIC | 2 |
| INV-020 | SN_DETERMINISTIC | 2 |

---

## Section Compliance (Prompt 1→10)

1. Unit tests (INV-001/003/012): **implemented**  
2. Integration runtime scenarios: **implemented**  
3. Determinism suite (equality/serialization/ordering/volatile removal): **implemented**  
4. Negative mandatory cases: **implemented**  
5. Classification-aware matrix behavior: **implemented**  
6. Fixture system (snapshot/runtime/corrupted): **implemented**  
7. Init failure simulation (`transport`): **implemented**  
8. Stop validation (snapshot exists, `STOPPED`, empty list): **implemented**  
9. Federation validation (`domainsRegistered` exists, contains `local`, sorted): **implemented**  
10. Documentation output: **this report**

---

## Determinism Guarantees Validated

- `normalizeSnapshot()` produces stable comparable output for equivalent runs.
- `normalizeSnapshot()` is idempotent: `N(N(s)) = N(s)`.
- `normalizeSnapshot()` is non-mutating on input snapshots.
- multi-run deterministic replay validated over **10 independent runs** with strict deep equality.
- volatile fields are excluded from normalized comparison:
  - timestamps
  - uptime
  - init duration/boot time metrics
- serialization determinism is enforced by `isDeterministicSnapshot()`.
- ordering guarantees enforced and tested for:
  - `runtime.activeComponentsList`
  - `federation.domainsRegistered`
  - metric keys (sanitized record)

Formal statement (validated under ADR-003.A harness constraints):

For all snapshots `s` produced by the same deterministic runtime scenario with equal configuration and equal lifecycle sequence,
`normalizeSnapshot(s)` is stable, reproducible, and deep-equal across runs.

---

## NON-DETERMINISTIC VALIDATION

Strategy principle:

- No strict equality on non-deterministic runtime signals.
- Presence, shape, bounded ranges, monotonic safety, multi-run bounded behavior, and no-crash guarantees are validated.

| INV-ID | CLASS | STRATEGY | STATUS | NOTES |
|--------|-------|----------|--------|-------|
| INV-006 | `NON_DETERMINISTIC` | ND-001..ND-006 observational layer | `OBSERVED_VALID` | CRDT/gossip/runtime fields present, bounded, finite, and stable under repeated runs |
| INV-003 | `TS_CONTROLLED` | controlled variability + bounded checks | `OBSERVED_BOUNDED` | deterministic comparison remains test-controlled; observational checks verify runtime safety domain |

Observational test blocks implemented in `invariants.nondeterministic.test.ts`:

- `ND-001` presence checks
- `ND-002` shape/type checks
- `ND-003` bounded value checks
- `ND-004` monotonic/non-regression checks
- `ND-005` multi-run variability safe-zone checks
- `ND-006` no-crash repeated start/stop checks

Outcome:

- blind skip policy removed for non-deterministic invariants
- classification path now records non-deterministic invariants as observed instead of skipped

---

## Failure Behavior Validated

- invalid runtime state/gauge mismatch rejected (`assertStateConsistency` false).
- unsorted component lists rejected by snapshot invariants validation.
- duplicated component/domain entries rejected by snapshot invariants validation.
- invalid list types and missing nested runtime fields rejected.
- corrupted snapshot shape rejected.
- non-deterministic snapshot object detection works.
- stop invariant checker fails when stop snapshot is missing (negative proof).
- init phase failure trace captured:
  - `lastInitPhase = transport`
  - `lastInitPhaseStatus = FAILED`
  - `lastInitErrorPhase = transport`

Stress and adversarial coverage added:

- lifecycle stress: double stop, stop-without-start, restart cycle, failure-then-restart.
- init trace stress: transport / observability / identity(sdk) phase failures plus last-failure overwrite behavior.
- corruption matrix: partial nested corruption, wrong types, partial ordering, duplicated entries.

---

## Known Limitations (Explicit / Accepted)

- INV-006 (`crdt_convergence`) remains non-deterministic runtime-wide by architecture and is validated observationally (bounded safety), not via strict equality.
- Some RT invariants depend on runtime config guards and are not inferable from snapshot-only evidence without integration context.
- Classification matrix is asserted by test logic; ADR-003.B can consume the same map for formal compliance matrix generation.
- deterministic guarantees assume stable runtime configuration and controlled test harness inputs (no external byzantine network perturbation injected at runtime).

---

## Audit Conclusion

ADR-003.A verification layer is now operational and audit-ready for deterministic/runtime/snapshot invariants under the declared classification model.

No regressions detected in build or new invariant suites.

