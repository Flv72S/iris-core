# IRIS — Fase 8 Governance Infrastructure

## Introduzione

La **Fase 8** trasforma la governance di IRIS in una infrastruttura completa, deterministica, verificabile e auditabile.  
Questa fase introduce una catena coerente di moduli che parte dall'esposizione read-only dello stato di governance, passa per enforcement, adattamento, decisione runtime, proof crittografico, attestazione, ledger, ricostruzione storica, certificazione e trust anchor, e si completa con auto-monitoraggio, snapshot globale e diff storico.

L'obiettivo architetturale della Fase 8 e':

- rendere la governance ispezionabile da sistemi esterni
- applicare policy in modo deterministico
- adattare il comportamento operativo al tier di governance
- bloccare o consentire azioni runtime tramite un gate unico
- produrre prove verificabili dello stato e delle decisioni
- registrare evidenze su ledger tamper-evident
- ricostruire lo stato storico
- certificare lo stato complessivo
- ancorare la fiducia a una root key
- rilevare anomalie in sola lettura
- produrre una fotografia globale verificabile
- confrontare snapshot nel tempo con diff verificabili

Tutti i moduli della Fase 8 seguono gli stessi principi:

- **determinismo**: stesso input, stesso output
- **statelessness**: nessun stato nascosto o persistente interno
- **pure computation**: logica calcolata in memoria
- **read-only by design** dove richiesto
- **assenza di DB, rete o filesystem** nei motori di governance
- **riuso dell'infrastruttura esistente** invece di riscrittura dei moduli

---

## Visione d'insieme

La pipeline concettuale della Fase 8 e':

`Governance Public API`  
→ `Policy Engine`  
→ `Self Adaptation`  
→ `Runtime Gate`  
→ `Cryptographic Proof`  
→ `Governance Attestation`  
→ `Governance Ledger`  
→ `Governance Time Machine`  
→ `Governance Certification Engine`  
→ `Governance Trust Anchor`  
→ `Governance Autonomous Watcher`  
→ `Governance Global Snapshot`  
→ `Governance Diff Engine`

In termini operativi:

1. un sistema esterno o un servizio interno interroga o costruisce lo stato di governance
2. le policy vengono valutate e aggregate in un enforcement state
3. l'adaptation engine costruisce il profilo operativo coerente con il tier
4. il runtime gate decide se un'azione e' consentita
5. il proof engine produce hash verificabili dell'intera pipeline decisionale
6. l'attestation converte il proof in un artefatto attestabile
7. il ledger registra la sequenza di attestazioni in una hash chain
8. la time machine ricostruisce lo stato governance nel tempo
9. il certification engine produce un certificato firmato dello stato
10. il trust anchor fornisce la root of trust per la firma
11. il watcher controlla coerenza e anomalie senza mutare lo stato
12. il global snapshot aggrega l'intera immagine di governance
13. il diff engine confronta snapshot diversi e produce un report verificabile

---

## Invarianti di Fase 8

- Nessun modulo di questa fase dipende da storage esterno per produrre il proprio output core.
- Gli output critici sono tutti hashabili o gia' hash-based.
- I moduli di verifica ricalcolano sempre il dato atteso invece di fidarsi di uno stato dichiarato.
- I moduli `8L`, `8M` e `8N` sono espressamente in **sola lettura** e non modificano la governance.
- Le strutture di dati principali sono immutabili o restituite come oggetti frozen dove opportuno.

---

## Step 8A — Governance Public API

### Scopo

`8A` introduce il livello pubblico read-only della governance IRIS, pensato per esporre a sistemi esterni una vista controllata, hashata e auditabile dello stato governance.

### Modulo

`src/governance/governance_api/`

### Componenti principali

- DTO di risposta:
  - `TierStatusResponse`
  - `GovernanceCertificateResponse`
  - `SLAGovernanceResponse`
  - `GovernanceSnapshotResponse`
  - `GovernanceHistoryResponse`
- provider di stato:
  - `IGovernanceStateProvider`
  - `DefaultGovernanceStateProvider`
- livello di query:
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

### Contratti esposti

Le response DTO includono sistematicamente:

- `snapshot_id`
- `timestamp`
- hash di risposta o hash governance

Questo garantisce che anche la superficie API sia tracciabile e integrabile in catene di audit.

### Endpoint concettuali

- `GET /governance/tier`
- `GET /governance/certificate`
- `GET /governance/sla`
- `GET /governance/snapshot`
- `GET /governance/history`

### Valore architetturale

`8A` e' il punto di contatto tra governance interna e osservabilita' esterna.  
Non decide, non muta e non certifica: espone in modo read-only il risultato delle pipeline di governance.

---

## Step 8B — Policy Engine

### Scopo

`8B` definisce il sistema deterministico di regole di governance che traduce policy in enforcement operativo.

### Modulo

`src/governance/policy_engine/`

### Componenti principali

- DSL e tipi:
  - `GovernancePolicy`
  - `PolicyCondition`
  - `PolicyAction`
  - `PolicyOperator`
  - `PolicyField`
- parsing:
  - `parsePolicyDSL()`
- valutazione:
  - `evaluatePolicy()`
- enforcement aggregato:
  - `evaluatePolicies()`
- gate per feature:
  - `isFeatureAllowed()`
- registry:
  - `DEFAULT_POLICIES`

### Output principale

`PolicyEnforcementResult`

Campi:

- `blockedFeatures`
- `allowedFeatures`
- `auditFrequencyMultiplier?`
- `certificationRequired?`

### Logica

Le policy vengono valutate contro `GovernanceTierSnapshot`.  
Le azioni vengono aggregate in una struttura unica che diventa input per i moduli successivi.

Azioni supportate nell'engine:

- `block_feature`
- `allow_feature`
- `increase_audit_frequency`
- `require_certification`

### Valore architetturale

`8B` e' il layer normativo deterministico di Fase 8.  
Se il tiering dice "chi sei", il policy engine dice "cosa puoi fare".

---

## Step 8C — Self Adaptation

### Scopo

`8C` converte il livello di governance e lo stato di enforcement in un profilo operativo applicabile al comportamento del sistema.

### Modulo

`src/governance/self_adaptation/`

### Componenti principali

- tipi:
  - `AutonomyLevel`
  - `AdaptationProfile`
  - `AdaptationSnapshot`
- strategie:
  - `computeAutonomyLevel()`
  - `computeAuditMultiplier()`
  - `resolveAllowedFeatures()`
  - `computeSafetyConstraintLevel()`
- profili:
  - `getAdaptationProfileForTier()`
- orchestrazione:
  - `computeAdaptationSnapshot()`
- snapshot hash-aware:
  - `withAdaptationHash()`

### Contratto dati

`AdaptationSnapshot` contiene:

- `snapshot_id`
- `tier`
- `governance_score`
- `adaptation_profile`
- `timestamp`

`AdaptationProfile` contiene:

- `autonomy`
- `auditFrequencyMultiplier`
- `safetyConstraintLevel`
- `allowedFeatureSet`

### Valore architetturale

`8C` e' il layer che traduce governance in comportamento regolato.  
Non decide se una singola azione sia eseguibile, ma prepara il profilo di sicurezza e autonomia che il runtime gate usera'.

---

## Step 8D — Runtime Gate

### Scopo

`8D` introduce il punto unico di controllo prima di qualsiasi azione AI o operazione governata.

### Modulo

`src/governance/runtime_gate/`

### Componenti principali

- tipi:
  - `RuntimeActionRequest`
  - `RuntimeDecision`
- guard:
  - `isFeatureExecutable()`
- resolver:
  - `resolveRuntimeDecision()`
- engine:
  - `evaluateRuntimeAction()`

### Contratto dati

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

### Valore architetturale

`8D` e' il "single gate of truth" prima dell'esecuzione.  
Riceve request, snapshot governance e policy enforcement, applica il profilo di adaptation e produce una decisione runtime verificabile.

---

## Step 8E — Cryptographic Proof

### Scopo

`8E` genera la prova crittografica dell'intera pipeline decisionale di governance.

### Modulo

`src/governance/cryptographic_proof/`

### Componenti principali

- tipo:
  - `GovernanceProof`
- hashing:
  - `hashObjectDeterministic()`
- builder:
  - `buildGovernanceProof()`
- verifier:
  - `verifyGovernanceProof()`

### Contratto dati

`GovernanceProof` contiene:

- `proof_id`
- `governance_snapshot_hash`
- `policy_enforcement_hash`
- `adaptation_hash`
- `runtime_decision_hash`
- `final_proof_hash`
- `timestamp`

### Regola chiave

`hashObjectDeterministic()` e' il primitivo centrale di hashing riusato in tutta la fase.  
L'output e' SHA-256 su `JSON.stringify(obj)` in formato hex.

### Valore architetturale

`8E` collega lo stato governance alla prova verificabile.  
Da qui in avanti, gli altri moduli non lavorano piu' solo su "stato", ma su stato hashato e dimostrabile.

---

## Step 8F — Governance Attestation

### Scopo

`8F` trasforma il proof in una attestazione di governance adatta a ledger e audit.

### Modulo

`src/governance/attestation/`

### Componenti principali

- tipo:
  - `GovernanceAttestation`
- builder:
  - `buildGovernanceAttestation()`
- verifier:
  - `verifyGovernanceAttestation()`
- serializer:
  - `serializeAttestation()`

### Contratto dati

`GovernanceAttestation` contiene:

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

### Valore architetturale

`8F` e' il ponte tra prova crittografica e registrazione tamper-evident.  
L'attestation e' piu' vicina al linguaggio dell'audit e dell'evidenza operativa rispetto al proof puro.

---

## Step 8G — Governance Ledger

### Scopo

`8G` introduce il ledger di governance in memoria, tamper-evident e verificabile.

### Modulo

`src/governance/ledger/`

### Componenti principali

- tipi:
  - `GovernanceLedger`
  - `GovernanceLedgerEntry`
- builder entry:
  - `buildLedgerEntry()`
- chain manager:
  - `createLedger()`
  - `appendAttestation()`
  - `getLatestEntry()`
  - `getLedgerSize()`
- verifica:
  - `verifyLedger()`

### Contratto dati

`GovernanceLedgerEntry` contiene:

- `index`
- `previous_hash`
- `attestation_hash`
- `ledger_hash`
- `timestamp`

`GovernanceLedger` contiene:

- `entries`

### Invarianti

- continuita' dell'indice
- continuita' di `previous_hash`
- ricalcolo coerente di `ledger_hash`

### Valore architetturale

`8G` e' il registro cronologico della governance.  
Ogni attestazione viene inserita in una hash chain, creando una cronologia verificabile e resistente a manipolazioni.

---

## Step 8H — Governance Time Machine

### Scopo

`8H` consente la ricostruzione read-only dello stato governance nel tempo.

### Modulo

`src/governance/time_machine/`

### Componenti principali

- tipi:
  - `GovernanceStateAtTime`
  - `AttestationResolver`
- ricostruzione:
  - `findClosestSnapshot()`
  - `getStateAt()`
- replay:
  - `replayFromSnapshot()`
- query storiche:
  - `getHistory()`
  - `getEventsByType()`
  - `getEventsByActor()`

### Contratto dati

`GovernanceStateAtTime` contiene:

- `timestamp`
- `entry`
- `attestation?`

### Valore architetturale

`8H` trasforma il ledger da semplice archivio append-only a sorgente di ricostruzione storica.  
Questo abilita audit temporali, replay deterministici, forensic analysis e correlazione eventi.

---

## Step 8I — Governance Certification Engine

### Scopo

`8I` produce una certificazione deterministica dell'intero stato governance corrente.

### Modulo

`src/governance/governance_certificate_engine/`

### Componenti principali

- tipo:
  - `GovernanceCertificate`
- builder:
  - `buildGovernanceCertificate()`
- verifier:
  - `verifyGovernanceCertificate()`
- export:
  - `exportGovernanceCertificate()`

### Contratto dati

`GovernanceCertificate` contiene:

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

### Valore architetturale

`8I` certifica che un determinato stato di governance e' stato composto in modo coerente, firmato e quindi verificabile in modo indipendente.

---

## Step 8J — Governance Trust Anchor

### Scopo

`8J` fornisce la root of trust per la governance IRIS.

### Modulo

`src/governance/trust_anchor/`

### Componenti principali

- tipi:
  - `GovernanceSignature`
  - `IRISRootKey`
- costanti:
  - `IRIS_ROOT_KEY_ID`
  - `IRIS_ROOT_PUBLIC_KEY_HASH`
- firma:
  - `signGovernanceObject()`
- verifica:
  - `verifyGovernanceSignature()`
- registry:
  - `TRUST_ANCHOR_REGISTRY`

### Contratti dati

`GovernanceSignature`:

- `signature`
- `algorithm`
- `key_id`
- `timestamp`

`IRISRootKey`:

- `key_id`
- `algorithm`
- `public_key_hash`

### Valore architetturale

`8J` e' il fondamento di fiducia dell'intera fase.  
Senza trust anchor, proof, certificati e verifiche esterne non avrebbero una radice di validazione affidabile.

---

## Step 8L — Governance Autonomous Watcher

### Scopo

`8L` introduce il motore di auto-sorveglianza della governance IRIS.

### Modulo

`src/governance/watcher/`

### Componenti principali

- alert:
  - `GovernanceAlert`
  - `createGovernanceAlert()`
- detector:
  - `detectPolicyViolations()`
  - `detectGovernanceDrift()`
  - `detectLedgerIntegrityIssues()`
  - `detectSuspiciousEvents()`
- orchestrazione:
  - `runGovernanceCheck()`

### Contratto dati

`GovernanceAlert` contiene:

- `alert_id`
- `type`
- `severity`
- `source`
- `description`
- `reference_event_id?`
- `reference_hash?`
- `timestamp`
- `alert_hash`

### Funzionamento

`runGovernanceCheck()` accetta:

- `governanceSnapshot`
- `policyEnforcement`
- `runtimeDecision`
- `certifiedSnapshotHash?`
- `ledger?`
- `ledgerEvents?`

e restituisce:

- `GovernanceAlert[]`

### Anomalie rilevate

- violation tra decisione runtime e policy
- drift tra snapshot corrente e snapshot certificato
- rottura integrita' ledger
- attivita' sospetta su eventi governance

### Vincolo fondamentale

Il watcher non modifica mai lo stato di IRIS.  
E' un modulo di sola analisi e detection.

---

## Step 8M — Governance Global Snapshot

### Scopo

`8M` produce una fotografia completa e verificabile dell'intero stato governance.

### Modulo

`src/governance/global_snapshot/`

### Componenti principali

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

`GlobalGovernanceSnapshot` contiene:

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

### Composizione

Il builder aggrega:

- Governance Tier Snapshot
- Policy Enforcement
- Adaptation Snapshot
- Runtime Decision
- Governance Proof
- Governance Attestation
- Ledger Head
- Governance Certificate
- Trust Anchor
- Watcher State

### Regola chiave

`global_hash` e' calcolato come SHA-256 della concatenazione degli hash componenti principali.

### Valore architetturale

`8M` rende possibile esportare una immagine governance completa, portabile e verificabile per audit, compliance, certificazione e migrazione infrastrutturale.

---

## Step 8N — Governance Diff Engine

### Scopo

`8N` conclude la Fase 8 introducendo il confronto deterministico tra due `GlobalGovernanceSnapshot`.

### Modulo

`src/governance/diff_engine/`

### Componenti principali

- tipi:
  - `GovernanceComponentChange`
  - `GovernanceDiffReport`
- hashing:
  - `computeGovernanceDiffHash()`
- engine:
  - `computeGovernanceDiff()`
- verifier:
  - `verifyGovernanceDiff()`

### Contratti dati

`GovernanceComponentChange`:

- `component`
- `previous_hash`
- `current_hash`

`GovernanceDiffReport`:

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

Il motore:

1. legge `snapshotA.global_hash` e `snapshotB.global_hash`
2. estrae gli hash dei componenti monitorati
3. registra solo i componenti con hash diversi
4. costruisce `changed_components`
5. genera `diff_hash`
6. restituisce `GovernanceDiffReport`

### Valore architetturale

`8N` abilita timeline storica, audit comparativo, forensic analysis e prova di compliance nel tempo.  
Con questo step la governance di IRIS non e' solo osservabile e certificabile, ma anche differenziabile in modo verificabile.

---

## Relazione tra gli step

La Fase 8 non e' un insieme di moduli isolati, ma una catena di artefatti:

1. `8A` espone la governance
2. `8B` produce enforcement
3. `8C` produce adaptation
4. `8D` produce decisione runtime
5. `8E` produce proof
6. `8F` produce attestation
7. `8G` registra su ledger
8. `8H` ricostruisce il passato
9. `8I` certifica lo stato
10. `8J` ancora la fiducia
11. `8L` sorveglia e segnala anomalie
12. `8M` aggrega tutto in uno snapshot globale
13. `8N` confronta snapshot nel tempo

Questa sequenza trasforma IRIS da semplice motore AI governato a **governance-grade AI system** con tracciabilita', verificabilita' e audit continuo.

---

## Artefatti verificabili prodotti dalla Fase 8

La fase produce i seguenti artefatti chiave:

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

Tutti questi artefatti sono pensati per essere:

- confrontabili
- serializzabili
- hashabili
- verificabili in modo indipendente

---

## Proprieta' sistemiche ottenute

Con la Fase 8, IRIS ottiene:

- **governance operativa**: enforcement e gating runtime
- **governance crittografica**: proof, attestazione, certificazione
- **governance storica**: ledger e time machine
- **governance fiduciaria**: trust anchor
- **governance osservabile**: public API e watcher
- **governance globale**: snapshot aggregato
- **governance comparativa**: diff engine

In termini strategici, la Fase 8 posiziona IRIS molto piu' vicino a:

- trust infrastructure systems
- AI accountability platforms
- governance-grade AI systems
- AI operating systems con auditing nativo

---

## Conclusione

La **Fase 8 — Governance Infrastructure** costruisce il nucleo di accountability di IRIS.

Non si limita a controllare il comportamento del sistema: lo rende dimostrabile, ricostruibile, certificabile e confrontabile nel tempo.

Il risultato finale e' una catena di governance in cui:

- ogni decisione puo' essere regolata
- ogni stato puo' essere hashato
- ogni prova puo' essere verificata
- ogni attestazione puo' essere registrata
- ogni registro puo' essere controllato
- ogni snapshot puo' essere esportato
- ogni variazione puo' essere diffata

Questo chiude tecnicamente la Fase 8 e prepara IRIS alla fase successiva di sistemi di governance ancora piu' autonomi, osservabili e verificabili.
