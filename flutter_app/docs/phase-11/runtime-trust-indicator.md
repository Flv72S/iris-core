# Phase 11.8.2 — Runtime Trust Indicator

## Enforcement (11.8.1) vs runtime visibility (11.8.2)

- **Enforcement:** The UI Certification Gate decides whether the main UI can be shown. No verified bundle and pack → gate closed → only the certification failure screen is visible. This is an access-control boundary.
- **Runtime visibility:** The Runtime Trust Indicator shows the current certification status *when the UI is already being shown* (or in any layout that has access to the resolved state). It does not open or close the gate; it only displays whether the current session is certified, plus derived data (pack hash, bundle hash, logical tick, session id). So: the gate enforces; the indicator informs.

## Regulatory value of visible trust

Making trust visible at runtime supports:

- **Auditability:** The user (or an auditor) can see that the session is certified and which pack/session/tick it corresponds to, without relying on out-of-band documentation.
- **Explainability:** The same hashes and identifiers shown in the indicator can be cross-checked with exported forensic bundles and compliance packs.
- **Non-repudiation:** A screenshot or replay that includes the indicator ties what was shown on screen to a specific pack and logical time.

The indicator does not *grant* trust; it *reflects* the outcome of the certification gate and the evidence (pack, time context) that was used to resolve it.

## Relation to audit and explainability

- The indicator’s data (pack hash, bundle hash, session, tick) are the same identifiers used in the Compliance Pack and in forensic export/import. An auditor can verify that the running UI’s indicator matches a specific pack and bundle.
- Explainability flows (trace, explanation, navigation) are backed by the same verified bundle. The indicator does not explain decisions; it shows that the current runtime is tied to a certified evidence set.

## No decision logic

The Runtime Trust Indicator and its resolver:

- Do not decide whether to certify; they only project the gate state and the supplied pack/time context into a displayable state.
- Do not read clock, network, or mutable storage.
- Do not modify any store or bundle.
- Are deterministic: same gate state, pack, and time context always yield the same `RuntimeTrustState` and the same visual output (modulo theme).

Trust is decided by the Certification Gate (11.8.1); the indicator only makes that result and its evidence visible in the UI.
