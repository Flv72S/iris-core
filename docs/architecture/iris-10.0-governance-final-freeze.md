# IRIS 10.0 — Governance & Control Plane Final Freeze
## Chiusura definitiva del Control Plane

**Microstep:** 10.0.F — Governance Final Freeze  
**Fase:** IRIS 10.0 — Control Plane (chiusura)  
**Natura:** Freeze architetturale · Nessuna nuova funzionalità · Nessuna modifica al codice esistente  
**Prerequisiti:** 10.0, 10.0.1, 10.0.2 implementati

---

## §1 — Stato del documento

- Il presente documento è **VINCOLANTE** — **MUST** essere rispettato da ogni uso o estensione del Control Plane IRIS
- **IRIS 10.0.x è DEFINITIVO e CHIUSO** — Governance Model, Registry, Kill-switch binding, Audit snapshot **MUST NOT** essere estesi in-place
- **Ogni estensione del Control Plane richiede una nuova fase numerata** — es. IRIS 11.x o nuova famiglia; **MUST NOT** retroagire su 10.0.x

---

## §2 — Ambito congelato

IRIS 10.0.x include **esclusivamente** i seguenti elementi. Descriviamo cosa **ESISTE**.

- **Governance Model (10.0)** — `IrisGovernanceModel`, `IrisGovernanceComponentState`; modello dichiarativo di configurazione runtime; nessuna decisione
- **Registry (10.0)** — `IrisGovernanceRegistry`; interfaccia read-only `isEnabled(componentId)`; nessuna scrittura
- **Governance Engine (10.0)** — `IrisGovernanceEngine`; `getSnapshot()` → `IrisGovernanceSnapshot`; solo wiring, nessuna logica
- **Kill-switch binding (10.0.1)** — `IrisKillSwitchBinding`, `IrisKillSwitchSnapshot`, `IrisKillSwitchBinder`; lettura stato da registry; nessuna modifica ai kill-switch
- **Audit Snapshot & Traceability (10.0.2)** — `IrisAuditEntry`, `IrisAuditSnapshot`, `IrisAuditCollector`; presenza/assenza, stato verificabile; nessun contenuto semantico, nessun logging automatico

IRIS 10.0.x **governa**, **osserva**, **fotografa lo stato**. **NON decide**, **NON reagisce**, **NON ottimizza**, **NON apprende**.

---

## §3 — Ambito escluso

È **formalmente vietato** introdurre in 10.0.x:

- **Delivery** — invio, dispatch, consegna; **MUST** vivere in 10.1 o oltre
- **Feedback** — feedback loop, osservazione reattiva; **MUST** vivere in 10.2 o oltre
- **Decision** — policy engine, rule engine, decision logic
- **Policy** — applicazione di policy che scelgano o alterino
- **Optimization** — ottimizzazione, “migliore” configurazione, auto-tuning
- **UX** — rendering, copy, presentazione; **MUST** restare in 9.3
- **Semantic mutation** — scrittura su Semantic Engine, interpretation, orchestration, messaging, rendering
- **Severity / importance / score** — nessuna classificazione decisionale
- **Auto-disable / auto-enable** — nessuna reazione automatica
- **Fallback intelligenti** — nessun override o fallback “smart”
- **Adaptive governance** — nessun adattamento
- **Storage / logging automatico** — audit è snapshot verificabile, **MUST NOT** essere logging o write-back

---

## §4 — Invarianti

Le seguenti invarianti **MUST** restare vere per IRIS 10.0.x:

- **Read-only** — Governance **MUST** solo leggere stato; **MUST NOT** mutare IRIS 9.x o semantic-layer
- **No side-effects** — **MUST NOT** invio, I/O, mutazione globale
- **No decision** — **MUST NOT** scegliere, filtrare, prioritizzare
- **No interpretation** — **MUST NOT** interpretare contenuti o risultati; solo presenza/assenza
- **Audit ≠ logging** — Audit snapshot **MUST** essere stato verificabile, serializzabile, firmabile; **MUST NOT** essere log stream, storage, o write-back

---

## §5 — Kill-switch semantics

- **Kill-switch = degradazione** — quando un kill-switch è OFF, l’output del layer interessato **MUST** essere vuoto o neutro; **MUST NOT** introdurre output alternativo o “fallback”
- **Mai reazione automatica** — Governance **MUST NOT** attivare/disattivare componenti in risposta a eventi; **MUST** solo esporre stato (lettura)
- **Mai override intelligente** — **MUST NOT** “conviene spegnere”, “sistema consiglia”, “auto-disable”

---

## §6 — Relazione con 10.1 / 10.2

- **10.1 (Delivery / Execution)** — **consuma** output di 9.3 e stato di 10.0; **MUST NOT** modificare 10.0.x; **MUST NOT** retroagire su Governance
- **10.2 (Feedback & Observation)** — **osserva**; **MUST NOT** scrivere su 10.0.x; **MUST NOT** introdurre feedback loop dentro il Control Plane congelato
- **Nessuna retroazione verso 10.0** — 10.1 e 10.2 **MUST** trattare 10.0.x come **read-only**

---

## §7 — Anti-pattern vietati

È **VIETATO** introdurre o suggerire in documentazione o codice IRIS 10.0.x:

- **smartGovernance** — **MUST NOT** attribuire logica “intelligente” alla governance
- **decisionPolicy** — **MUST NOT** policy che decidano
- **adaptiveControl** — **MUST NOT** controllo adattivo
- **autoTuning** — **MUST NOT** auto-tuning
- **systemChooses** — **MUST NOT** “il sistema sceglie”
- **recommendedState** — **MUST NOT** “stato raccomandato”
- **governanceAI** — **MUST NOT** AI o apprendimento nel Control Plane

---

## §8 — Dichiarazione notarile

**IRIS 10.0.x è definitivo e congelato.**

**Ogni estensione del Control Plane richiede una nuova fase numerata.**

- Nessuna estensione in-place di Governance Model, Registry, Kill-switch binding, Audit
- IRIS 10.0.x certificato come **Control Plane non decisionale**: governa, osserva, fotografa
- Base sigillata per **10.1 Delivery / Execution** e **10.2 Feedback & Observation**

**VINCOLANTE. DEFINITIVO. CONGELATO.**

---

**Fine documento — IRIS 10.0 Governance Final Freeze.**
