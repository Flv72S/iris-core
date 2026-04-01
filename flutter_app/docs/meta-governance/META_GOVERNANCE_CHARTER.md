# Meta-Governance Charter

Ogni modifica a questo documento richiede una GCP ratificata.

## 1. Principi fondamentali

- Versionamento obbligatorio (GovernanceVersion).
- Nessuna modifica retroattiva; storia immutabile.
- Separazione dei poteri (proponente, revisore, ratificatore).
- Determinismo e auditabilità (provenance, snapshot).

## 2. H-CORE (H0–H5)

- H0: Autorità e ruoli.
- H1: Governance versioning (no downgrade).
- H2: GCP (descriptor, validazione).
- H3: Impact analysis (report obbligatorio).
- H4: Decisione e ratifica (vote, quorum).
- H5: Attivazione (solo engine; registry non manipolabile).

## 3. H-EXTENDED (H6–H10)

- H6: Snapshot temporali.
- H7: Drift detection.
- H8: Provenance chain (verifyIntegrity).
- H9: Meta-Governance CI (gate su modifiche).
- H10: Charter e chiusura fase.

## 4. Ciclo governance

Proposal (GCP) → Analysis (Impact) → Decision → Ratification → Activation → Snapshot → Provenance. CI verifica ogni modifica a meta-governance e Charter.

## 5. Invarianti

- Una sola versione attiva; history append-only; nessuna attivazione senza APPROVED; nessun downgrade; registry solo tramite engine; Charter modificabile solo tramite GCP.

## 6. Separazione poteri

Proponente ≠ Ratificatore; nessuna auto-ratifica.

## 7. Modifica del Charter

Solo tramite GCP + Impact + Decision + Ratification + Activation. Modifiche non versionate → CI FAIL (Gate 7).
