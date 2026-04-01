# IRIS — Fase 8 Governance Infrastructure Technical Specification

## Scopo del documento

Questo documento fornisce una versione tecnica e strutturata della **Fase 8 — Governance Infrastructure** di IRIS.

Copre i seguenti step:

- `8A — Governance Public API`
- `8B — Policy Engine`
- `8C — Self Adaptation`
- `8D — Runtime Gate`
- `8E — Cryptographic Proof`
- `8F — Governance Attestation`
- `8G — Governance Ledger`
- `8H — Governance Time Machine`
- `8I — Governance Certification Engine`
- `8J — Governance Trust Anchor`
- `8L — Governance Autonomous Watcher`
- `8M — Governance Global Snapshot`
- `8N — Governance Diff Engine`

Il focus e' sui contratti, sulle relazioni tra moduli e sugli artefatti prodotti.

---

## Obiettivi tecnici della Fase 8

La Fase 8 introduce una infrastruttura di governance che deve essere:

- deterministica
- verificabile
- stateless
- auditabile
- ricostruibile nel tempo
- esportabile verso sistemi esterni

Requisiti trasversali:

- nessun DB nei motori core
- nessuna rete nei motori core
- nessun filesystem nei motori core
- riuso dei moduli esistenti
- verifica tramite ricalcolo degli hash

---

## Pipeline tecnica di fase

La pipeline di Fase 8 e':

1. `8A` espone dati governance read-only
2. `8B` produce `PolicyEnforcementResult`
3. `8C` produce `AdaptationSnapshot`
4. `8D` produce `RuntimeDecision`
5. `8E` produce `GovernanceProof`
6. `8F` produce `GovernanceAttestation`
7. `8G` produce e mantiene `GovernanceLedger`
8. `8H` ricostruisce `GovernanceStateAtTime`
9. `8I` produce `GovernanceCertificate`
10. `8J` fornisce `IRISRootKey` e verifica firme
11. `8L` produce `GovernanceAlert[]`
12. `8M` produce `GlobalGovernanceSnapshot`
13. `8N` produce `GovernanceDiffReport`

---

## Invarianti di implementazione

- Gli hash sono usati come primitive di integrita' e confronto.
- La funzione base di hashing condivisa e' `hashObjectDeterministic()`.
- I moduli di verifica ricalcolano il dato atteso invece di fidarsi del contenuto dichiarato.
- `8L`, `8M` e `8N` non alterano lo stato del sistema.
- Gli artefatti principali sono progettati per serializzazione e comparazione deterministiche.

---

## Step 8A — Governance Public API

### Path

`src/governance/governance_api/`

### Public surface

- DTO:
  - `TierStatusResponse`
  - `GovernanceCertificateResponse`
  - `SLAGovernanceResponse`
  - `GovernanceSnapshotResponse`
  - `GovernanceHistoryEntryResponse`
  - `GovernanceHistoryResponse`
- services:
  - `IGovernanceStateProvider`
  - `DefaultGovernanceStateProvider`
  - `GovernanceQueryService`
- controller:
  - `GovernanceController`
- routing:
  - `createGovernanceRoutes()`
  - `matchGovernanceRoute()`
- middleware:
  - `apiKeyGuard`
  - `rateLimiter`
  - `auditLogGovernanceQuery`
- server:
  - `createGovernanceHttpServer()`

### DTO principali

Le response includono tipicamente:

- `snapshot_id`
- `timestamp`
- `response_hash` o hash governance

### Ruolo nella pipeline

Espone a client esterni una vista read-only e hash-aware dello stato governance.

---

## Step 8B — Policy Engine

### Path

`src/governance/policy_engine/`

### Public surface

- tipi:
  - `GovernancePolicy`
  - `PolicyCondition`
  - `PolicyAction`
  - `PolicyOperator`
  - `PolicyField`
- parse:
  - `parsePolicyDSL()`
- evaluation:
  - `evaluatePolicy()`
  - `evaluatePolicies()`
- feature gate:
  - `isFeatureAllowed()`
- registry:
  - `DEFAULT_POLICIES`

### Output principale

`PolicyEnforcementResult`

Campi:

- `blockedFeatures: readonly string[]`
- `allowedFeatures: readonly string[]`
- `auditFrequencyMultiplier?: number`
- `certificationRequired?: boolean`

### Ruolo nella pipeline

E' il modulo che converte policy dichiarative in enforcement operativo da propagare ai moduli successivi.

---

## Step 8C — Self Adaptation

### Path

`src/governance/self_adaptation/`

### Public surface

- tipi:
  - `AutonomyLevel`
  - `AdaptationProfile`
  - `AdaptationSnapshot`
  - `AdaptationSnapshotWithHash`
- strategie:
  - `computeAutonomyLevel()`
  - `computeAuditMultiplier()`
  - `resolveAllowedFeatures()`
  - `computeSafetyConstraintLevel()`
- profili:
  - `getAdaptationProfileForTier()`
- orchestration:
  - `computeAdaptationSnapshot()`
  - `withAdaptationHash()`

### Output principale

`AdaptationSnapshot`

Campi:

- `snapshot_id`
- `tier`
- `governance_score`
- `adaptation_profile`
- `timestamp`

`AdaptationProfile`:

- `autonomy`
- `auditFrequencyMultiplier`
- `safetyConstraintLevel`
- `allowedFeatureSet`

### Ruolo nella pipeline

Traduce `GovernanceTierSnapshot + PolicyEnforcementResult` in un profilo comportamentale operativo.

---

## Step 8D — Runtime Gate

### Path

`src/governance/runtime_gate/`

### Public surface

- tipi:
  - `RuntimeActionRequest`
  - `RuntimeDecision`
- guard:
  - `isFeatureExecutable()`
- decision:
  - `resolveRuntimeDecision()`
- orchestration:
  - `evaluateRuntimeAction()`

### Contratti

`RuntimeActionRequest`:

- `action`
- `requestedFeatures?`

`RuntimeDecision`:

- `allowed`
- `reason?`
- `autonomyLevel`
- `allowedFeatures`
- `auditMultiplier`
- `safetyConstraintLevel`

### Ruolo nella pipeline

Costituisce il singolo punto di controllo prima di una azione runtime.

---

## Step 8E — Cryptographic Proof

### Path

`src/governance/cryptographic_proof/`

### Public surface

- tipo:
  - `GovernanceProof`
- hashing:
  - `hashObjectDeterministic()`
- builder:
  - `buildGovernanceProof()`
- verifier:
  - `verifyGovernanceProof()`

### Primitive chiave

`hashObjectDeterministic(obj)`:

- serializzazione con `JSON.stringify(obj)`
- hashing SHA-256
- output hex

### Output principale

`GovernanceProof`

Campi:

- `proof_id`
- `governance_snapshot_hash`
- `policy_enforcement_hash`
- `adaptation_hash`
- `runtime_decision_hash`
- `final_proof_hash`
- `timestamp`

### Ruolo nella pipeline

Produce la prova hashata dell'intera pipeline decisionale governance.

---

## Step 8F — Governance Attestation

### Path

`src/governance/attestation/`

### Public surface

- tipo:
  - `GovernanceAttestation`
- builder:
  - `buildGovernanceAttestation()`
- verifier:
  - `verifyGovernanceAttestation()`
- serializer:
  - `serializeAttestation()`

### Output principale

`GovernanceAttestation`

Campi:

- `attestation_id`
- `proof`
- `governance_tier`
- `autonomy_level`
- `allowed_features`
- `audit_multiplier`
- `safety_constraint_level`
- `decision_allowed`
- `attestation_hash`
- `timestamp`

### Ruolo nella pipeline

Converte il proof in un artefatto attestabile adatto a ledger, export e audit.

---

## Step 8G — Governance Ledger

### Path

`src/governance/ledger/`

### Public surface

- tipi:
  - `GovernanceLedger`
  - `GovernanceLedgerEntry`
- chain:
  - `createLedger()`
  - `appendAttestation()`
  - `getLatestEntry()`
  - `getLedgerSize()`
- entry builder:
  - `buildLedgerEntry()`
- verifier:
  - `verifyLedger()`

### Contratti

`GovernanceLedgerEntry`:

- `index`
- `previous_hash`
- `attestation_hash`
- `ledger_hash`
- `timestamp`

`GovernanceLedger`:

- `entries`

### Invarianti verificati

- indice sequenziale
- continuita' `previous_hash`
- ricalcolo corretto `ledger_hash`

### Ruolo nella pipeline

Fornisce una catena tamper-evident delle attestazioni governance.

---

## Step 8H — Governance Time Machine

### Path

`src/governance/time_machine/`

### Public surface

- tipi:
  - `GovernanceStateAtTime`
  - `AttestationResolver`
  - `GovernanceReplayEvent`
- reconstruction:
  - `findClosestSnapshot()`
  - `getStateAt()`
- replay:
  - `replayFromSnapshot()`
- history query:
  - `getHistory()`
  - `getEventsByType()`
  - `getEventsByActor()`

### Output principale

`GovernanceStateAtTime`

Campi:

- `timestamp`
- `entry`
- `attestation?`

### Ruolo nella pipeline

Abilita ricostruzione storica e replay dello stato governance a partire dal ledger.

---

## Step 8I — Governance Certification Engine

### Path

`src/governance/governance_certificate_engine/`

### Public surface

- tipo:
  - `GovernanceCertificate`
- builder:
  - `buildGovernanceCertificate()`
- verifier:
  - `verifyGovernanceCertificate()`
- export:
  - `GovernanceCertificateExport`
  - `exportGovernanceCertificate()`

### Output principale

`GovernanceCertificate`

Campi:

- `certificate_id`
- `tier`
- `governance_snapshot_hash`
- `policy_enforcement_hash`
- `adaptation_hash`
- `runtime_decision_hash`
- `governance_proof_hash`
- `final_certificate_hash`
- `timestamp`
- `issuer`
- `signature`

### Ruolo nella pipeline

Certifica lo stato governance completo con firma e hash finale verificabili.

---

## Step 8J — Governance Trust Anchor

### Path

`src/governance/trust_anchor/`

### Public surface

- tipi:
  - `GovernanceSignature`
  - `IRISRootKey`
- constants:
  - `IRIS_ROOT_KEY_ID`
  - `IRIS_ROOT_PUBLIC_KEY_HASH`
- sign:
  - `signGovernanceObject()`
- verify:
  - `verifyGovernanceSignature()`
- registry:
  - `TRUST_ANCHOR_REGISTRY`

### Contratti

`GovernanceSignature`:

- `signature`
- `algorithm`
- `key_id`
- `timestamp`

`IRISRootKey`:

- `key_id`
- `algorithm`
- `public_key_hash`

### Ruolo nella pipeline

Fornisce la root of trust crittografica per firme e verifiche esterne.

---

## Step 8L — Governance Autonomous Watcher

### Path

`src/governance/watcher/`

### Public surface

- alert:
  - `GovernanceAlert`
  - `createGovernanceAlert()`
- detectors:
  - `detectPolicyViolations()`
  - `detectGovernanceDrift()`
  - `detectLedgerIntegrityIssues()`
  - `detectSuspiciousEvents()`
- orchestration:
  - `runGovernanceCheck()`

### Contratto dati

`GovernanceAlert`

Campi:

- `alert_id`
- `type`
- `severity`
- `source`
- `description`
- `reference_event_id?`
- `reference_hash?`
- `timestamp`
- `alert_hash`

### Parametri operativi

`runGovernanceCheck()` accetta:

- `governanceSnapshot`
- `policyEnforcement`
- `runtimeDecision`
- `certifiedSnapshotHash?`
- `ledger?`
- `ledgerEvents?`

e restituisce:

- `GovernanceAlert[]`

### Proprieta'

- sola lettura
- nessuna modifica allo stato IRIS
- deterministico
- riuso di ledger, proof, certification e policy engine

---

## Step 8M — Governance Global Snapshot

### Path

`src/governance/global_snapshot/`

### Public surface

- tipi:
  - `GlobalGovernanceSnapshot`
  - `GlobalSnapshotHashFields`
  - `GlobalSnapshotAuditRecord`
- hashing:
  - `computeGlobalSnapshotHash()`
- builder:
  - `buildGlobalGovernanceSnapshot()`
- export:
  - `exportGlobalSnapshotJSON()`
  - `exportGlobalSnapshotAuditRecord()`
- verifier:
  - `verifyGlobalSnapshot()`

### Contratto dati

`GlobalGovernanceSnapshot`

Campi:

- `snapshot_id`
- `timestamp`
- `governance_snapshot_hash`
- `policy_enforcement_hash`
- `adaptation_hash`
- `runtime_state_hash`
- `governance_proof_hash`
- `attestation_hash`
- `ledger_head_hash`
- `certificate_hash`
- `watcher_state_hash`
- `governance_tier`
- `trust_anchor_id`
- `global_hash`

### Input del builder

`buildGlobalGovernanceSnapshot(...)` aggrega:

- `GovernanceTierSnapshot`
- `PolicyEnforcementResult`
- `AdaptationSnapshot`
- `RuntimeDecision`
- `GovernanceProof`
- `GovernanceAttestation`
- `GovernanceLedgerEntry`
- `GovernanceCertificate`
- `IRISRootKey`
- `watcherState`

### Regola di hashing

`global_hash` e' SHA-256 della concatenazione di:

- `governance_snapshot_hash`
- `policy_enforcement_hash`
- `adaptation_hash`
- `runtime_state_hash`
- `governance_proof_hash`
- `attestation_hash`
- `ledger_head_hash`
- `certificate_hash`
- `watcher_state_hash`

### Ruolo nella pipeline

Fornisce una fotografia globale esportabile e verificabile dello stato governance.

---

## Step 8N — Governance Diff Engine

### Path

`src/governance/diff_engine/`

### Public surface

- tipi:
  - `GovernanceComponentChange`
  - `GovernanceDiffReport`
- hashing:
  - `computeGovernanceDiffHash()`
- engine:
  - `computeGovernanceDiff()`
- verifier:
  - `verifyGovernanceDiff()`

### Contratti

`GovernanceComponentChange`

- `component`
- `previous_hash`
- `current_hash`

`GovernanceDiffReport`

- `snapshot_A_hash`
- `snapshot_B_hash`
- `changed_components`
- `diff_hash`
- `timestamp`

### Componenti monitorati

- `tier`
- `policy_enforcement`
- `adaptation`
- `runtime_decision`
- `governance_proof`
- `attestation`
- `ledger_head`
- `certificate`
- `trust_anchor`
- `watcher_state`

### Algoritmo

`computeGovernanceDiff(snapshotA, snapshotB)`:

1. legge `snapshotA.global_hash` e `snapshotB.global_hash`
2. estrae gli hash dei componenti monitorati
3. confronta ogni componente
4. registra i cambi in `changed_components`
5. genera `diff_hash` tramite `computeGovernanceDiffHash(...)`
6. restituisce `GovernanceDiffReport`

`computeGovernanceDiffHash(...)` riusa `hashObjectDeterministic()` su:

- `snapshotAHash`
- `snapshotBHash`
- `changes`

`verifyGovernanceDiff(...)`:

1. ricalcola il diff
2. confronta:
   - `snapshot_A_hash`
   - `snapshot_B_hash`
   - `changed_components`
   - `diff_hash`
3. ritorna `true` solo in caso di corrispondenza completa

### Ruolo nella pipeline

Abilita confronto storico verificabile tra snapshot governance completi.

---

## Relazioni strutturali tra i moduli

La dipendenza logica tra gli step e' la seguente:

- `8B` dipende semanticamente da `GovernanceTierSnapshot`
- `8C` dipende da `8B`
- `8D` dipende da `8B` e `8C`
- `8E` hash-a la pipeline `snapshot + enforcement + adaptation + decision`
- `8F` attesta il `GovernanceProof`
- `8G` registra le attestazioni
- `8H` ricostruisce lo stato dal ledger
- `8I` certifica lo stato hashato della pipeline
- `8J` ancora firme e verifiche
- `8L` osserva `snapshot + enforcement + decision + ledger + certification`
- `8M` aggrega i riferimenti hash dei moduli precedenti
- `8N` confronta due `8M`

---

## Artefatti verificabili di output

La Fase 8 produce i seguenti artefatti chiave:

- response API hashate
- `PolicyEnforcementResult`
- `AdaptationSnapshot`
- `RuntimeDecision`
- `GovernanceProof`
- `GovernanceAttestation`
- `GovernanceLedgerEntry`
- `GovernanceStateAtTime`
- `GovernanceCertificate`
- `GovernanceSignature`
- `GovernanceAlert`
- `GlobalGovernanceSnapshot`
- `GovernanceDiffReport`

Questi artefatti sono:

- serializzabili
- confrontabili
- hashabili
- verificabili in modo indipendente

---

## Proprieta' sistemiche ottenute

Al termine della Fase 8, IRIS dispone di:

- governance operativa
- governance crittografica
- governance storica
- governance fiduciaria
- governance osservabile
- governance globale
- governance comparativa

In termini tecnici, questo significa che lo stato governance puo' essere:

- calcolato
- esposto
- hashato
- attestato
- registrato
- ricostruito
- certificato
- monitorato
- esportato
- comparato nel tempo

---

## Conclusione tecnica

La Fase 8 definisce una infrastruttura di governance completa in cui ogni stadio della pipeline produce un artefatto formalizzabile e verificabile.

Il valore tecnico finale e' che IRIS puo' dimostrare in modo deterministicamente ricostruibile:

- quale stato governance era attivo
- quali policy erano in effetto
- quale profilo operativo e' stato derivato
- quale decisione runtime e' stata presa
- quale proof e attestazione la supportano
- come e' stata registrata sul ledger
- quale certificato la rappresenta
- quale trust anchor la rende verificabile
- quali anomalie sono state rilevate
- quale fotografia globale descrive quel momento
- quali differenze esistono rispetto a un altro momento

Questa e' la chiusura tecnica della **Fase 8 — Governance Infrastructure**.
