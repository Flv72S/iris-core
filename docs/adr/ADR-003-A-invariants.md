# ADR-003.A — Runtime Invariants Definition (Formal Spec)

**Scope:** microstep **16F.X8 — Runtime Convergence Layer** (init pipeline, `initializeRuntimeConvergence`, observability contract/validation, test harness).  
**Code base path:** `iris-sim/src/` (unico tree dove sono definiti gli artefatti citati).  
**Normative references:** `docs/adr/ADR-001-runtime-stabilization-layer.md`; `docs/adr/ADR-002-canonical-secure-runtime.md` (contract canonico; il nome `ADR-002-runtime-contract` nel prompt equivale a questo file).

---

## 1. Scope & Purpose

### 1.1 Cosa sono gli invariants (IRIS)

Un **invariant** è una proposizione `P` su stato osservabile e/o su transizioni di lifecycle tale che, se `P` è falsa prima o durante esercizio del runtime canonico, il sistema è **non conforme** al modello di convergenza 16F.X8 (determinismo, assenza di stato parziale operativo, sicurezza di boundary, osservabilità, auditabilità).

Gli invariants non sostituiscono `ADR-002` (principi) né `ADR-001` (decisioni di implementazione): li **operazionalizzano** su segnali verificabili (`runtime.state`, `activeComponents`, metriche, snapshot, test).

### 1.2 Perché servono al Runtime Convergence

Il layer di convergenza combina transport sicuro, gossip, CRDT, sync distribuito e osservabilità. Senza invariants espliciti:

- uno stato **RUNNING** può essere confuso con uno stato **parzialmente attivo**;
- failure di fase possono restare **non localizzabili** rispetto al contract;
- snapshot possono risultare **strutturalmente invalidi** pur essendo consumati downstream.

### 1.3 Relazione con ADR-002

| Principio ADR-002 | Ruolo degli invariants (ADR-003.A) |
|-------------------|-------------------------------------|
| Deterministic execution | INV-003, INV-012, vincoli su ordinamento metriche/traces |
| No partial state | INV-002, INV-004, INV-005 |
| Fail-fast | INV-014, INV-015 |
| Observability as source of truth | INV-011, INV-012, INV-013, INV-020 |

---

## 2. Invariant Catalogue (CORE)

### INV-001 — runtime_state_valid

**ID:** INV-001  
**Name:** `runtime_state_valid`  
**Category:** lifecycle  
**Scope:** GLOBAL  

**Description:**  
Ogni snapshot che espone `runtime` deve avere `runtime.state` in un insieme chiuso e coerente con il tipo `IrisRuntimeState`. Valori fuori insieme = violazione strutturale.

**Formal Condition:**  
`snap.runtime` assente **oppure**  
`( snap.runtime.state ∈ {'INITIALIZING','RUNNING','STOPPING','STOPPED','ERROR'} )`

**Runtime Signals:**  
- `snap.runtime.state`  
- metrica `metrics.metrics['runtime.state']` (0 | 0.5 | 1 in `buildObservabilitySnapshot`)

**Violation Condition:**  
`∃ snap : snap.runtime ≠ undefined ∧ snap.runtime.state ∉ AllowedStates`  

**Severity:** CRITICAL  
**Enforcement:** ERROR_STATE / MONITOR_ONLY (validazione snapshot: rifiuto persistenza)  
**Related Components:** observability  

---

### INV-002 — no_partial_initialization

**ID:** INV-002  
**Name:** `no_partial_initialization`  
**Category:** lifecycle  
**Scope:** INIT  

**Description:**  
Se il nodo dichiara `runtime.state = 'RUNNING'`, allora la pipeline di init ha completato tutte le fasi che marcano componenti attive richieste dal profilo canonico X8 (almeno i 6 `RuntimeComponent` tramite `activeComponents.add` nelle fasi `identity` … `observability`).

**Formal Condition:**  
`runtime.state = 'RUNNING'` ⇒ `|activeComponents| ≥ 6`  
(dove `6 = |{identity,transport,gossip,crdt,federation,observability}|`)

**Runtime Signals:**  
- `runtime.state`  
- `snap.runtime.activeComponents`  
- `metrics.metrics['runtime.active_components']`  
- `metrics.metrics['runtime.component.count']`  

**Violation Condition:**  
`runtime.state = 'RUNNING' ∧ |activeComponents| < 6`

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST implicito (impossibile raggiungere RUNNING senza ultima `activeComponents.add('observability')` se `start()` completa senza throw; la violazione indica bug o snapshot corrotto)  
**Related Components:** transport, gossip, crdt, federation, observability, session_control  

---

### INV-003 — deterministic_boot

**ID:** INV-003  
**Name:** `deterministic_boot`  
**Category:** observability  
**Scope:** INIT  

**Description:**  
Per una stessa configurazione runtime e stesso `cwd` isolato, osservazioni normalizzate dello stato post-boot devono essere confrontabili in modo ripetibile (ordinamento chiavi metriche nel builder; test `normalizeSnapshot` + `deepStrictEqual`).

**Formal Condition:**  
Siano `snap1`, `snap2` due snapshot post-`start()` con stessa config e ambiente di test isolato; sia `N(s)` la proiezione normalizzata usata in test. Allora `N(snap1) = N(snap2)` (test harness).

**Runtime Signals:**  
- `metrics.metrics` con chiavi ordinate via `sortMetricKeys` in `buildObservabilitySnapshot`  
- campi `runtime`, `transport`, `gossip`, `crdt` in `normalizeSnapshot` (test)

**Violation Condition:**  
Test `deterministic boot state across multiple starts` fallisce **oppure** chiavi metriche non deterministiche senza ordinamento.

**Severity:** HIGH  
**Enforcement:** MONITOR_ONLY (test); builder applica sorting  
**Related Components:** observability  

---

### INV-004 — active_components_consistency

**ID:** INV-004  
**Name:** `active_components_consistency`  
**Category:** observability  
**Scope:** RUNTIME  

**Description:**  
Il numero di componenti attive nel campo `runtime` dello snapshot deve coincidere con le gauge `runtime.active_components` e `runtime.component.count` quando le metriche sono attive.

**Formal Condition:**  
`obs.metrics` attive ⇒  
`snap.runtime.activeComponents = floor(metrics['runtime.active_components']) = floor(metrics['runtime.component.count'])`  
(con `floor` su numeri interi attesi dal gauge)

**Violation Condition:**  
Metriche presenti ∧ disuguaglianza tra i tre valori.

**Severity:** HIGH  
**Enforcement:** MONITOR_ONLY  
**Related Components:** observability  

---

### INV-005 — component_lifecycle_alignment

**ID:** INV-005  
**Name:** `component_lifecycle_alignment`  
**Category:** lifecycle  
**Scope:** SHUTDOWN  

**Description:**  
Dopo `stop()` riuscito, `runtime.state` deve essere `'STOPPED'` e l'insieme logico di componenti runtime deve essere azzerato (`activeComponents.clear()` nel `finally` di `stop()`).

**Formal Condition:**  
`stop()` completato ⇒ `runtime.state = 'STOPPED' ∧ |activeComponents| = 0`

**Runtime Signals:**  
- `getRuntimeState()`  
- `snap.runtime` dopo stop (se emesso)

**Violation Condition:**  
`stop()` completato ∧ (`runtime.state ≠ 'STOPPED'` ∨ `|activeComponents| > 0`)

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST / ERROR_STATE sul path stop (finally forza stato)  
**Related Components:** transport, gossip, crdt, federation, observability  

---

### INV-006 — crdt_convergence

**ID:** INV-006  
**Name:** `crdt_convergence`  
**Category:** data_consistency  
**Scope:** RUNTIME  

**Description:**  
Sotto il profilo canonico (gossip+CRDT attivi, peer connessi), due nodi che applicano la stessa operazione devono esporre lo stesso `getRuntimeCRDTSnapshot()` entro il bound temporale del test.

**Formal Condition:**  
Condizione di test: `deepStrictEqual(snapA, snapB)` su output di `getRuntimeCRDTSnapshot()` dopo `applyCRDTOperation` e attesa.

**Runtime Signals:**  
- `getRuntimeCRDTSnapshot()`  
- `snap.crdt` (metriche aggregate engine)

**Violation Condition:**  
Test multi-node convergence fallisce.

**Severity:** HIGH  
**Enforcement:** MONITOR_ONLY (TS_CONTROLLED; non deterministic runtime-wide)  
**Related Components:** crdt, gossip  

---

### INV-007 — no_unresolved_conflicts

**ID:** INV-007  
**Name:** `no_unresolved_conflicts`  
**Category:** data_consistency  
**Scope:** GLOBAL  

**Description:**  
Le metriche CRDT nello snapshot non possono dichiarare più conflitti risolti di quanti siano plausibilmente coperti da operazioni applicate o rifiutate (coerenza contabile).

**Formal Condition:**  
`snap.crdt` presente ⇒  
`conflictsResolved ≤ operationsApplied + operationsRejected`

**Runtime Signals:**  
- `snap.crdt.conflictsResolved`, `operationsApplied`, `operationsRejected`  
- allineato a `validateObservabilitySnapshot`

**Violation Condition:**  
`conflictsResolved > operationsApplied + operationsRejected`

**Severity:** HIGH  
**Enforcement:** MONITOR_ONLY (validazione snapshot)  
**Related Components:** crdt, observability  

---

### INV-008 — secure_transport_required

**ID:** INV-008  
**Name:** `secure_transport_required`  
**Category:** security  
**Scope:** INIT  

**Description:**  
Con profilo runtime canonico, `config.runtime.transport.secure` deve essere `true` (default true); altrimenti `initializeRuntimeConvergence` lancia e il boot fallisce.

**Formal Condition:**  
`(config.runtime.transport.secure ?? true) = true` per nodo conforme X8.

**Runtime Signals:**  
- eccezione `INVALID_CONFIG` messaggio `secure transport must be enabled`  
- test failure isolation con `secure: false` ⇒ `getRuntimeState() = 'ERROR'`

**Violation Condition:**  
`(config.runtime.transport.secure ?? true) ≠ true` ∧ init convergence eseguito.

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST (`initializeRuntimeConvergence`)  
**Related Components:** transport  

---

### INV-009 — federation_integrity

**ID:** INV-009  
**Name:** `federation_integrity`  
**Category:** federation  
**Scope:** INIT  

**Description:**  
Il profilo runtime richiede federation abilitata; in convergenza viene registrato almeno un dominio `local` coerente in `InMemoryDomainRegistry` prima di `DistributedSyncManager`.

**Formal Condition:**  
`(config.runtime.federation.enabled ?? true) = true`  
∧ presenza dominio `local` con vincoli di registry in `initializeRuntimeConvergence` (configurazione minimale).

**Runtime Signals:**  
- throw `federation must be enabled` se disabilitata  
- `snap.federation` / `snap.federationSecurity` quando sync persiste metriche  

**Violation Condition:**  
`runtime.federation.enabled = false` nel profilo canonico.

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST  
**Related Components:** federation  

#### INV-009a — federation_enabled_config (split)
- `Formal Condition`: `(config.runtime.federation.enabled ?? true) = true`
- `Verification Class`: RT_DETERMINISTIC

#### INV-009b — federation_domains_registered_snapshot (split)
- `Formal Condition`: `snap.federation.domainsRegistered` presente quando runtime federation e' attiva
- `Verification Class`: SN_DETERMINISTIC

---

### INV-010 — identity_initialized

**ID:** INV-010  
**Name:** `identity_initialized`  
**Category:** security  
**Scope:** INIT  

**Description:**  
Prima di `transport` e del resto della pipeline, la fase `identity` costruisce TrustRegistry/TrustEngine/TrustSigner e aggiunge `'identity'` a `activeComponents`. CRDT/sync successivi assumono engine gossip creato con `nodeId` coerente.

**Formal Condition:**  
Ordine `start()`: dopo fase `identity`, `'identity' ∈ activeComponents`.  
Equivalente osservabile: prima di `runInitPhase('transport',...)` non si procede senza successo della fase `identity`.

**Runtime Signals:**  
- sequenza `runInitPhase('identity',...)`  
- `activeComponents` post-fase

**Violation Condition:**  
`runInitPhase('transport',...)` eseguito senza successo precedente di `identity`.

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST (`await` sequenziale)  
**Related Components:** session_control, federation, observability  

---

### INV-011 — snapshot_completeness

**ID:** INV-011  
**Name:** `snapshot_completeness`  
**Category:** observability  
**Scope:** GLOBAL  

**Description:**  
Sezione `node`, `metrics` e campi `runtime` obbligatori nel builder devono essere popolati; sezione opzionale assente non introduce `undefined` in JSON serializzato (contract: optional sections omitted when disabled).

**Formal Condition:**  
`snap.node.id ≠ '' ∧ snap.metrics.metrics è object ∧ snap.metrics.timestamp string`  
∧ se `snap.runtime` presente: `updatedAt` string non vuota, `errors` finito ≥ 0, `activeComponents` finito ≥ 0.

**Runtime Signals:**  
- `buildObservabilitySnapshot`  
- `validateObservabilitySnapshot` errors: `node.id required`, `metrics.*`, `runtime.updatedAt invalid`, ecc.

**Violation Condition:**  
`validate(snap).ok = false` per campi core.

**Severity:** CRITICAL  
**Enforcement:** MONITOR_ONLY (validate); `writeObservabilitySnapshot` rifiuta snapshot invalidi  

**Related Components:** observability  

---

### INV-012 — snapshot_determinism

**ID:** INV-012  
**Name:** `snapshot_determinism`  
**Category:** observability  
**Scope:** RUNTIME  

**Description:**  
Persistenza snapshot JSON applica `sanitizeSnapshotForJson` con ordinamento record (`sortRecord`, `sortMetricsRecord`) per stabilità serializzazione.

**Formal Condition:**  
`writeObservabilitySnapshot(s, cwd)` ⇒ payload serializzato = funzione pura di `s` con chiavi ordinate stabilmente (stesso albero ⇒ stesso ordinamento chiavi al primo livello sanitizzato).

**Runtime Signals:**  
- `iris-sim/src/observability/observability_persist.ts` (`sanitize`, `sortRecord`)

**Violation Condition:**  
Scrittura senza sanitizzazione **oppure** validate ok ma ordine chiavi non deterministico nel file (non è il caso con implementazione attuale).

**Severity:** MEDIUM  
**Enforcement:** MONITOR_ONLY  
**Related Components:** observability  

---

### INV-013 — metrics_consistency

**ID:** INV-013  
**Name:** `metrics_consistency`  
**Category:** observability  
**Scope:** RUNTIME  

**Description:**  
Tutte le entrate in `metrics.metrics` devono essere numeri finiti (no NaN) quando validate.

**Formal Condition:**  
`∀ k ∈ keys(snap.metrics.metrics) : Number.isFinite(snap.metrics.metrics[k])`

**Runtime Signals:**  
- `validateObservabilitySnapshot` → `metrics.metrics[k] must be finite`

**Violation Condition:**  
`∃ k : ¬Number.isFinite(snap.metrics.metrics[k])`

**Severity:** HIGH  
**Enforcement:** MONITOR_ONLY  
**Related Components:** observability  

---

### INV-014 — fail_fast_enforced

**ID:** INV-014  
**Name:** `fail_fast_enforced`  
**Category:** lifecycle  
**Scope:** INIT  

**Description:**  
Ogni fase `runInitPhase(phase, fn)` intercetta errori, incrementa failure metric, logga `RUNTIME_INIT_FAILURE`, e rilancia `RuntimeInitError(phase, …, cause)`. Nessuna fase successiva viene awaiting dopo throw.

**Formal Condition:**  
`failure in phase p` ⇒ `¬ executed(successors(p))`  
(dove `successors` è l'ordine lineare in `start()`)

**Runtime Signals:**  
- `runtime.init.phase.failures` (increment su catch)  
- log `RUNTIME_INIT_FAILURE`  
- `RuntimeInitError.phase`

**Violation Condition:**  
Dopo eccezione in fase `p`, `runtime.state = 'RUNNING'` **oppure** fase `q > p` ha side-effect persistente.

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST  
**Related Components:** tutti i layer coinvolti in `start()`  

---

### INV-015 — error_state_consistency

**ID:** INV-015  
**Name:** `error_state_consistency`  
**Category:** lifecycle  
**Scope:** INIT  

**Description:**  
Se `start()` fallisce, `runtime.state = 'ERROR'`, `started = false`, `runtimeErrors` incrementato, e il nodo non è READY operativo.

**Formal Condition:**  
`start()` reject/throw dal catch interno ⇒ `runtime.state = 'ERROR' ∧ started = false`  
(test: dopo `assert.rejects(() => n.start())`, `getRuntimeState() === 'ERROR'`).

**Runtime Signals:**  
- `runtime.state`  
- `runtime.errors`  
- `getRuntimeState()`

**Violation Condition:**  
`start()` fallisce ∧ `runtime.state ≠ 'ERROR'` ∨ `started = true`.

**Severity:** CRITICAL  
**Enforcement:** ERROR_STATE  
**Related Components:** observability  

---

### INV-016 — gossip_runtime_required (supporto)

**ID:** INV-016  
**Name:** `gossip_runtime_required`  
**Category:** security  
**Scope:** INIT  

**Description:**  
Profilo runtime: gossip deve essere enabled; altrimenti init convergence lancia.

**Formal Condition:**  
`(config.runtime.gossip.enabled ?? true) = true`

**Violation Condition:**  
`false` ⇒ throw `gossip must be enabled`

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST  
**Related Components:** gossip  

---

### INV-017 — crdt_runtime_required (supporto)

**ID:** INV-017  
**Name:** `crdt_runtime_required`  
**Category:** data_consistency  
**Scope:** INIT  

**Formal Condition:**  
`(config.runtime.crdt.enabled ?? true) = true`

**Violation Condition:**  
`false` ⇒ throw `crdt must be enabled`

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST  
**Related Components:** crdt  

---

### INV-018 — legacy_transport_forbidden (supporto)

**ID:** INV-018  
**Name:** `legacy_transport_forbidden`  
**Category:** security  
**Scope:** INIT  

**Formal Condition:**  
`allowLegacy = false` ⇒ `¬ (transport.type definito ∧ type ≠ 'ws')`

**Violation Condition:**  
`allowLegacy false` ∧ `transport.type` non-ws ⇒ throw `legacy transport path not allowed`

**Severity:** HIGH  
**Enforcement:** FAIL_FAST  
**Related Components:** transport  

---

### INV-019 — control_plane_node_secret (supporto condizionale)

**ID:** INV-019  
**Name:** `control_plane_node_secret`  
**Category:** security  
**Scope:** INIT  

**Description:**  
Se control plane abilitato **e** `nodeSecurity.enabled`, un secret valido (lunghezza) deve esistere.

**Formal Condition:**  
`controlPlane.enabled ∧ nodeSecurity.enabled` ⇒ `∃ secret valido tra nodeSecret/nextSecret`

**Violation Condition:**  
throw `nodeSecurity.enabled requires nodeSecret or nextSecret`

**Severity:** HIGH  
**Enforcement:** FAIL_FAST (`validateNodeSecurityForControlPlane`)  
**Related Components:** observability  

---

### INV-020 — snapshot_write_rejects_invalid (supporto)

**ID:** INV-020  
**Name:** `snapshot_write_rejects_invalid`  
**Category:** observability  
**Scope:** RUNTIME  

**Formal Condition:**  
`writeObservabilitySnapshot(s)` ⇒ `validate(s).ok` altrimenti throw Error con lista errori.

**Violation Condition:**  
Scrittura su disco senza validate pre-pass.

**Severity:** CRITICAL  
**Enforcement:** FAIL_FAST (persistenza)  
**Related Components:** observability  

---

## 3. Required Invariants (minimum obligatorio)

Gli invariant seguenti sono obbligatori nel catalogo con **ID stabili** e **Name** in `snake_case` come da specifica 16F.X8:

| ID | Name |
|----|------|
| INV-001 | `runtime_state_valid` |
| INV-002 | `no_partial_initialization` |
| INV-003 | `deterministic_boot` |
| INV-004 | `active_components_consistency` |
| INV-005 | `component_lifecycle_alignment` |
| INV-006 | `crdt_convergence` |
| INV-007 | `no_unresolved_conflicts` |
| INV-008 | `secure_transport_required` |
| INV-009 | `federation_integrity` |
| INV-010 | `identity_initialized` |
| INV-011 | `snapshot_completeness` |
| INV-012 | `snapshot_determinism` |
| INV-013 | `metrics_consistency` |
| INV-014 | `fail_fast_enforced` |
| INV-015 | `error_state_consistency` |

Invarianti **INV-016 … INV-020** estendono il catalogo con guardie e persistenza verificabili nel codice attuale (non sostituiscono il minimo sopra).

---

## 4. Formalization Rules

**Notazione.**

- `runtime.state` ∈ `IrisRuntimeState` = `{ 'INITIALIZING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR' }` (`iris-sim/src/sdk/iris_node.ts`).
- `activeComponents` = cardinalità del `Set<RuntimeComponent>` dove `RuntimeComponent` = `{ identity, transport, gossip, crdt, federation, observability }` (stesso file).
- `snap` = valore di tipo `IrisObservabilitySnapshot` (`iris-sim/src/observability/observability_contract.ts`).
- `validate(snap)` = `validateObservabilitySnapshot(snap)` (`iris-sim/src/observability/observability_invariants.ts`).

**Regole di scrittura.**

- Condizioni esplicite: uso di `⇒`, `∧`, `∀`, `=`, `≠`, insiemi ammessi.
- Ogni invariant nel catalogo (§2) riporta ancoraggio sotto **Runtime Mapping** (§7).

**Enforcement (semantica).**

- `FAIL_FAST`: eccezione durante init; `start()` non completa; tipicamente `runtime.state → 'ERROR'` nel catch di `start()`.
- `ERROR_STATE`: stato `runtime.state = 'ERROR'` dopo failure pipeline (non RUNNING operativo).
- `WARNING`: solo log; non blocca (es. legacy flag).
- `MONITOR_ONLY`: verificabile solo via metriche/snapshot/test; nessun guard nel codice elencato.

---

## 5. Invariant Classification (raggruppamento)

**Lifecycle:** INV-001, INV-002, INV-005, INV-010, INV-014, INV-015, INV-018, INV-019 (condizionale).  

**Security / boundary:** INV-008, INV-016, INV-017, INV-018, INV-019.  

**Federation / sync domain:** INV-009 (+ effetti `distributedSync` in `initializeRuntimeConvergence`).  

**Data (CRDT / gossip):** INV-006, INV-007, INV-017.  

**Observability:** INV-003, INV-004, INV-011, INV-012, INV-013, INV-020.  

---

## 6. Dependency Graph

**Primari (nessun altro invariant li implica come precondizione logica minima):**  
INV-008, INV-016, INV-017, INV-009, INV-018, INV-019 (se applicabile), INV-014.

**Derivati / ordine pipeline:**  
INV-010 → INV-002 → INV-004  
INV-014 ⇒ INV-015 (Failure nel catch `start()` forza ERROR_STATE)  
INV-011 ⇒ INV-007, INV-013 (validazione strutturata prima di coerenze CRDT/metrics)  
INV-020 ⇒ INV-011 (persistenza dipende da validate)  
INV-002 ∧ INV-006 ⇒ convergenza CRDT testabile (INIT + RUNTIME)  
INV-003 ⇔ INV-012 (stessa famiglia determinismo osservabile; INIT vs persist)

**Grafo compatto (solo ID):**  
`INV-008 → INV-010 → INV-002 → INV-004`  
`INV-016, INV-017, INV-009 → INV-014 → INV-015`  
`INV-011 → INV-013 → INV-007`  
`INV-011 → INV-020 → INV-012`

---

## 7. Runtime Mapping (where / when)

| ID | Verifica nel codice | Quando |
|----|---------------------|--------|
| INV-001 | `observability_invariants.ts` (`runtime.state` whitelist); `buildObservabilitySnapshot` popola `out.runtime` | snapshot validation / ogni snapshot |
| INV-002 | `iris_node.ts` `start()` sequenza fino ad `activeComponents.add('observability')` prima di `runtimeState='RUNNING'` | dopo init ok |
| INV-003 | `sortMetricKeys`; `runtime_convergence.test.ts` `normalizeSnapshot` | test; ogni build snapshot |
| INV-004 | `buildObservabilitySnapshot` gauges `runtime.active_components`, `runtime.component.count`, field `activeComponents` | ogni snapshot con metrics |
| INV-005 | `stop()` `finally`: `activeComponents.clear()`, `runtimeState='STOPPED'` | shutdown |
| INV-006 | `runtime_convergence.test.ts` `deepStrictEqual(snapA,snapB)` | test certify |
| INV-007 | `observability_invariants.ts` blocco `crdt` | snapshot validation |
| INV-008–INV-009, INV-016–INV-018 | `initializeRuntimeConvergence` guardie | init gossip/convergence |
| INV-010 | `runInitPhase('identity',...)`, `initIdentity` | init |
| INV-011–INV-013, INV-020 | `validateObservabilitySnapshot`, `writeObservabilitySnapshot` | snapshot loop / persist |
| INV-014 | `runInitPhase` try/catch | init per fase |
| INV-015 | `start()` catch | init failure |

Percorsi file:  
`iris-sim/src/sdk/iris_node.ts`,  
`iris-sim/src/observability/observability_invariants.ts`,  
`iris-sim/src/observability/observability_persist.ts`,  
`iris-sim/src/runtime/tests/runtime_convergence.test.ts`.

---

## 8. Validation Readiness (per invariant, summary)

Legenda: **RT** = verifica in processo live; **SN** = verifica su `IrisObservabilitySnapshot`; **TS** = test automatizzato.

| ID | RT | SN | TS |
|----|----|----|-----|
| INV-001 | SI | SI | SI (indiretto) |
| INV-002 | SI | SI | SI |
| INV-003 | PARZIALE | PARZIALE | SI |
| INV-004 | SI | SI | SI |
| INV-005 | SI | PARZIALE | SI |
| INV-006 | PARZIALE | NO | SI (TS_CONTROLLED) |
| INV-007 | NO | SI | SI |
| INV-008 | SI | NO | SI |
| INV-009 | SI | SI (split 009b) | SI |
| INV-010 | SI | PARZIALE | SI (indiretto) |
| INV-011 | PARZIALE | SI | SI |
| INV-012 | PARZIALE | SI | SI (indiretto) |
| INV-013 | NO | SI | SI |
| INV-014 | SI | PARZIALE | SI (indiretto) |
| INV-015 | SI | PARZIALE | SI |
| INV-016 | SI | NO | SI |
| INV-017 | SI | NO | SI |
| INV-018 | SI | NO | SI |
| INV-019 | SI | NO | SI |
| INV-020 | PARZIALE | SI | SI |

**Nota:** "PARZIALE" RT indica che serve osservabilità abilitata o snapshot emesso; alcuni guard non loggano su metrica dedicata ma solo throw.

---

## 9. Coerenza con ADR-001 e ADR-002

- **ADR-001:** phase wrapper `runInitPhase`, ordinamento init/stop, `RuntimeInitError`, `activeComponents`, metriche `runtime.*` → coperti da INV-001–005, INV-014–015, INV-004.  
- **ADR-002:** niente stato parziale operativo (RUNNING implica completezza) → INV-002; fail-fast → INV-014–015; determinismo osservabile → INV-003, INV-012; truth sugli snapshot → INV-011, INV-013, INV-020, INV-007.

---

## 10. Decision Summary (ADR-003.A)

Gli invariants del runtime 16F.X8 sono definiti come **predicati verificabili** su lifecycle, config di convergenza, snapshot e metriche.  
La **fonte di verità strutturale** è `validateObservabilitySnapshot`; la **fonte di verità operativa RUNNING** è la congiunzione `runtime.state = 'RUNNING'` ∧ `|activeComponents| ≥ 6`.  
I **guard** in `initializeRuntimeConvergence` e `validateNodeSecurityForControlPlane` sono enforcement **FAIL_FAST** critici per sicurezza e boundary.  
I test `runtime_convergence.test.ts` e la suite `test:certify` chiudono il gap per **convergenza CRDT** e **determinismo boot** (INV-006, INV-003).

---

## 11. Alignment — IRIS logging SDK (16F.5.FINAL.CERTIFICATION)

Separately from this **16F.X8 runtime convergence** catalogue, the **IRIS logging/audit SDK** (`src/sdk/invariants.ts`, `ADR003_INVARIANT_DECLARATIONS`) defines an executable **principle → enforcement → evidence** matrix for audit snapshots (`SN` / `RT` / `TS`), canonical snapshot normalization (`normalizeAuditSnapshot(..., 'compare')`), and formal `replayOrdinal` assignment.  
For normative detail of that layer see **`docs/sdk/runtime.md`** and **`docs/logging/16F4-HARDENING.md`**; this ADR remains the formal spec for **runtime** invariants above.
