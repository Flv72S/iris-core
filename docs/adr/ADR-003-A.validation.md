# ADR-003.A — Validation Report (Formal Conditions vs Implementazione)

**Riferimento:** `docs/adr/ADR-003-A-invariants.md`  
**Codebase:** `iris-sim/src/`  
**Obiettivo:** Per ogni invariant estrarre **Formal Condition**, **Runtime Signals**, **Runtime Mapping**; valutare (1) trasformabilità in predicato booleano, (2) disponibilità dati, (3) determinismo; segnalare gap.

**Legenda valutazione**

| Voce | Significato |
|------|-------------|
| SN | Verifica possibile solo da `IrisObservabilitySnapshot` |
| RT | Verifica possibile da stato/API runtime (es. `getRuntimeState`, `IrisConfig`) |
| TS | Verifica tramite test (incluso multi-process / timing) |

---

## 1. Per-invariant extraction & verification

| ID | Formal Condition (estratta) | Runtime Signals (estratti) | Runtime Mapping (ADR §7 + ancoraggio) | Booleano? | Solo dati reali? | Deterministico? |
|----|----------------------------|-----------------------------|----------------------------------------|------------|------------------|------------------|
| INV-001 | `snap.runtime` assente ∨ `snap.runtime.state ∈ AllowedStates` | `snap.runtime.state`; `metrics.metrics['runtime.state']` | `observability_invariants.ts` (whitelist); `iris_node.ts` `buildObservabilitySnapshot` | SI (SN) | SI: snapshot + metrics export | SI per validazione SN. **Nota:** mapping gauge `runtime.state` (0/0.5/1) non è biunivoco con stringa; confronto incrociato richiede tabella di mapping esplicita o si usa solo SN string |
| INV-002 | `runtime.state = 'RUNNING'` ⇒ `|activeComponents| ≥ 6` | `runtime.state`; `snap.runtime.activeComponents`; `runtime.active_components`; `runtime.component.count` | `iris_node.ts` `start()` fino a `activeComponents.add('observability')` prima di `runtimeState='RUNNING'` | SI se `|activeComponents|` letto come `snap.runtime.activeComponents` (non è cardinality del Set esportata come elenco) | PARZIALE: il **Set** interno non è esposto; solo **cardinalità** in snapshot. `≥ 6` assume che 6 tag siano sempre quelli canonici (vero per `start()` attuale) | SI su snapshot singolo post-boot |
| INV-003 | Stessa config + cwd isolato ⇒ `N(snap1) = N(snap2)` con `N` = normalizzazione test | `metrics.metrics` ordinato (`sortMetricKeys`); sottoinsiemi in `normalizeSnapshot` (test) | `iris_node.ts` `sortMetricKeys`; `runtime_convergence.test.ts` `normalizeSnapshot` | PARZIALE: richiede **definizione chiusa** di `N` (oggi solo nel test) | PARZIALE: snapshot raw include `node.timestamp`, `uptime_seconds`, `runtime.updatedAt` (tipicamente **esclusi** da `N` nel test) | NO su snapshot grezzo; SI sulla proiezione `N` **se** fissata e usata ovunque |
| INV-004 | Metrics attive ⇒ `snap.runtime.activeComponents = floor(runtime.active_components) = floor(runtime.component.count)` | tre campi sopra | `iris_node.ts` `buildObservabilitySnapshot` (stesso tick) | SI (SN) | SI se `obs.metrics` abilitate; se metrics disabilitate, premessa falsa / check NA | SI nello stesso snapshot |
| INV-005 | `stop()` completato ⇒ `runtime.state = 'STOPPED'` ∧ `|activeComponents| = 0` | `getRuntimeState()`; `snap.runtime` dopo stop | `iris_node.ts` `stop()` `finally`: `activeComponents.clear()`, `runtimeState='STOPPED'` | PARZIALE: `|activeComponents| = 0` **non** ha API pubblica; deducibile solo da SN se emissione snapshot post-`stop()` o da whitebox | PARZIALE: stato STOPPED SI; cardinalità 0 NO senza snapshot o internals | SI per `getRuntimeState() === 'STOPPED'`; cardinalità senza segnale dedicato = gap |
| INV-006 | Test: `deepStrictEqual(getRuntimeCRDTSnapshot_A, getRuntimeCRDTSnapshot_B)` dopo op + attesa | `getRuntimeCRDTSnapshot()`; `snap.crdt` (aggregati) | `runtime_convergence.test.ts` multi-node | SI in TS | SI con due nodi + network in-process | **NO** come invariant globale: dipende da scheduling/timing (`wait(120)`), fanout gossip, carico — può essere **flaky** al variare dell’ambiente |
| INV-007 | `snap.crdt` ⇒ `conflictsResolved ≤ operationsApplied + operationsRejected` | campi `snap.crdt.*` | `observability_invariants.ts` blocco `crdt` | SI (SN) | SI se sezione `crdt` presente; altrimenti vacuo vero / NA | SI |
| INV-008 | `(config.runtime.transport.secure ?? true) === true` (profilo canonico) | throw `secure transport must be enabled`; test `secure: false` → ERROR | `iris_node.ts` `initializeRuntimeConvergence` | SI (RT su `IrisConfig`) | NO su **solo** SN: `config` non è campo snapshot | SI (lettura config) |
| INV-009 | `(config.runtime.federation.enabled ?? true) === true` ∧ dominio `local` registrato | throw federation; `snap.federation*` se persistenza sync | `initializeRuntimeConvergence` + registry | PARZIALE: prima parte booleana RT; seconda parte **non** esportata come predicato SN strutturato (assenza campo "domains_registered") | PARZIALE | SI per flag; **debole** per "integrity registry" senza telemetria dedicata |
| INV-010 | Dopo `identity` ok: `'identity' ∈ activeComponents`; equival ordine `start()` | sequenza `runInitPhase('identity')`; `activeComponents` | `iris_node.ts` `runInitPhase` / `initIdentity` | PARZIALE: membership **non** in SN (solo count). Verifica diretta richiede log strumentato o whitebox | NO su SN puro | SI dato il codice `await` sequenziale (prova statica + test d’integrazione) |
| INV-011 | Shape snapshot: `node`, `metrics`, e se `runtime` presente campi richiesti | `validateObservabilitySnapshot` errors | `buildObservabilitySnapshot`; `validateObservabilitySnapshot` | SI (è sostanzialmente `validate(...).ok` con sotto-insieme) | SI | SI |
| INV-012 | `writeObservabilitySnapshot(s)` ⇒ serializzazione stabile (chiavi ordinate a livelli sanitizzati) | `sanitizeSnapshotForJson`, `sortRecord` | `observability_persist.ts` | PARZIALE come **runtime predicate** unico: equivalenza "puramente funzionale" richiede doppio `sanitize` + confronto stringa o hash | SI (stesso `s`) | SI per **processo di persistenza** fissato; due chiamate successive con **stesso** `s` devono produrre stesso JSON (salvo non-determinismo esterni non presenti nel codice mostrato) |
| INV-013 | `∀k: Number.isFinite(metrics.metrics[k])` | validator su ogni entry | `validateObservabilitySnapshot` | SI (SN) | SI | SI |
| INV-014 | Fallimento fase `p` ⇒ nessun successore eseguito | `runtime.init.phase.failures`; log `RUNTIME_INIT_FAILURE`; `RuntimeInitError.phase` | `iris_node.ts` `runInitPhase`; `start()` sequenza | NO post-facto su SN unico senza log/trace per fase; SI come **whitebox** (static: await impedisce continuazione) o test che forza throw | PARZIALE: fase da errore non sempre in SN | Staticamente SI per struttura `await`; osservazionale senza log = ambiguo |
| INV-015 | `start()` fallisce ⇒ `runtime.state === 'ERROR'` ∧ `started === false` | `runtime.state`, `runtime.errors`, `getRuntimeState()` | `iris_node.ts` `start()` catch | SI (RT + TS) | PARZIALE: `started` non in snapshot | SI nel flusso testato |
| INV-016 | `(config.runtime.gossip.enabled ?? true) === true` | throw `gossip must be enabled` | `initializeRuntimeConvergence` | SI (RT) | NO su solo SN | SI |
| INV-017 | `(config.runtime.crdt.enabled ?? true) === true` | throw `crdt must be enabled` | `initializeRuntimeConvergence` | SI (RT) | NO su solo SN | SI |
| INV-018 | `allowLegacy === false` ⇒ `¬(transport.type definito ∧ type !== 'ws')` | throw `legacy transport path not allowed` | `initializeRuntimeConvergence` | SI (RT) | NO su solo SN | SI |
| INV-019 | `controlPlane.enabled ∧ nodeSecurity.enabled` ⇒ secret valido | throw in `validateNodeSecurityForControlPlane` | `iris_node.ts` `initConfiguration` | SI (RT) | NO su solo SN | SI |
| INV-020 | `writeObservabilitySnapshot(s)` implica `validate(s).ok` | throw su write | `observability_persist.ts` `writeObservabilitySnapshot` | SI (ispezione codice + test integrazione) | SI | SI |

---

## 2. Verifiche richieste (sintesi globale)

### 2.1 Trasformabile in codice booleano?

- **SI (operativo):** INV-001, INV-002 (via count SN), INV-004, INV-007, INV-011, INV-012 (via doppio sanitize/compare), INV-013, INV-015 (RT), INV-016–019 (RT), INV-020 (wrapper + test).
- **PARZIALE:** INV-003 (serve `N` normativo condiviso fuori dal test), INV-005 (manca cardinalità pubblica), INV-009 (seconda clausola), INV-010 (membership), INV-014 (post-facto OSS).
- **NO / solo TS o log:** INV-006 come invariant di sistema assoluto (timing); INV-014 come prova osservativa senza telemetria fase.

### 2.2 Usa solo dati realmente disponibili?

- **Snapshot-only audit:** sufficienti per INV-001, INV-002 (count), INV-004, INV-007, INV-011–013, INV-020 (indirettamente no: write non è in snapshot, ma effetto è assenza file o errore).  
- **Richiede config/runtime API o test:** INV-008–019, INV-015 (`started`), INV-006.  
- **Gap noto:** `activeComponents` come **insieme** non è serializzato; solo **count** (INV-002/005 limitazione).

### 2.3 Deterministico?

- **SI:** controlli puramente strutturali/numerici su SN fissato (INV-001, INV-004, INV-007, INV-011–013).  
- **CONDIZIONATO:** INV-003, INV-012 (determinismo dopo normalizzazione / stesso input).  
- **NO / non garantito:** INV-006 (convergenza asincrona + timeout empirico).

---

## 3. Invariants non verificabili (o non verificabili nello scope dichiarato)

| ID | Problema |
|----|-----------|
| INV-006 | Richiede **due** repliche e **tempo**; non è una proprietà snapshot-only; non è deterministicamente chiusa senza modello di rete/scheduling. |
| INV-014 | Post-incident su **solo** ultimo snapshot: **non** si ricava "nessun successore eseguito" senza log `RUNTIME_INIT_*` strutturato con `phase` o senza trace. |
| INV-005 | `|activeComponents| = 0` dopo `stop()` non esposto; verificabile solo se si aggiunge metrica/`snapshot` post-stop o API. |
| INV-009 | Clausola "dominio local coerente nel registry" **non** ha predicato SN diretto. |

---

## 4. Invariants ambigui

| ID | Ambiguità | Mitigazione suggerita |
|----|-----------|----------------------|
| INV-001 | Coerenza `snap.runtime.state` vs gauge `runtime.state` numerica | Specificare mapping ufficiale o vietare il confronto incrociato |
| INV-002 | `≥ 6` come proxy di "tutti i RuntimeComponent" senza enumerazione nel SN | Esportare `active_components bitmask` o lista ordinata in snapshot |
| INV-003 | `N(s)` definita solo nel test | Spostare `N` in modulo condiviso (`e.g. observability_normalize.ts`) e versionarla |
| INV-009 | "integrity" mescola policy config e stato interno registry | Separare INV-009a (flag) e INV-009b (telemetry federation domain count) |
| INV-010 | "∈ activeComponents" non osservabile | Sostituire con invariant osservabile: p.es. ordine fase + count ≥ 1 dopo identity |
| INV-012 | "funzione pura" è meta-proprietà | Sostituire con test: `sanitize(s)===sanitize(s)` e golden JSON per casi campione |
| INV-014 | "side-effect persistente" vago | Definire insieme di risorse osservabili (file `.iris`, socket) o richiedere log con `phase` |

---

## 5. Invariants ridondanti (o quasi)

| Gruppo | Note |
|--------|------|
| INV-011 ⊇ INV-013 (metriche finite sono parte della validazione globale) | Mantenere INV-013 solo se serve granularità alert; altrimenti unificare. |
| INV-001 ⊆ INV-011 (se `runtime` presente e validato) | Ridondanza accettabile: INV-001 è chip di stato minimo per compliance veloce. |
| INV-003 vs INV-012 | Stessa famiglia "determinismo"; INV-003 boot-osservabile, INV-012 persistenza — documentare separazione esplicita. |
| INV-008, INV-016–018 | Tutti guard in `initializeRuntimeConvergence`; ridondanti come **policy** ma utili come **voci di compliance** separate per matrice audit. |
| INV-014 vs INV-015 | INV-015 è conseguenza osservativa del catch dopo fail; INV-014 è proprietà di ordine — non ridondanti ma **accoppiati**. |

---

## 6. Conclusione operativa

- **Pronti per checker automatico snapshot:** INV-001, INV-002 (count), INV-004, INV-007, INV-011–013, parti di INV-012.  
- **Richiedono contesto config/logs/test:** INV-008–019, INV-014–015, INV-006.  
- **Azione prioritaria per audit SN-only:** esporre **fase ultima fallita** e/o **elenco componenti** (non solo count) e fissare **`N` di normalizzazione** per INV-003.
