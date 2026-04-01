# IRIS 11.x — Decision Plane Final Freeze
## Chiusura definitiva del Decision Plane

**Microstep:** 11.x.F — Decision Plane Final Freeze  
**Fase:** IRIS 11.x — Decision Plane (chiusura)  
**Natura:** Freeze architetturale vincolante · Nessuna modifica funzionale  
**Prerequisiti:** 11.0, 11.1, 11.2, 11.3 implementati

---

## §1 — Stato

- **IRIS 11.x è DEFINITIVO** — **MUST** essere rispettato da ogni uso o integrazione del Decision Plane
- **Decision Plane CONGELATO** — **MUST NOT** essere esteso in-place nella fase 11.x
- **Non estendibile nella fase 11.x** — ogni evoluzione operativa o di Action Bridging **MUST** essere realizzata come IRIS 12.x o fase esplicita; **MUST NOT** essere retroattiva su 11.0–11.3

---

## §2 — Ambito congelato

Si congela formalmente quanto segue. Elencazione di ciò che **ESISTE**.

- **Decision Model (11.0)** — `IrisDecisionModel`, `IrisDecisionEntry`, `IrisDecisionSnapshot`, `IrisDecisionEngine`; skeleton; nessuna logica decisionale operativa
- **Decision Artifacts (11.1)** — `IrisDecisionArtifact`, `IrisDecisionArtifactSet`, `IrisDecisionProducer`, `IrisDecisionArtifactEngine`; artefatti dichiarativi; nessuna esecuzione
- **Decision Evaluation (11.2)** — `IrisDecisionEvaluationNote`, `IrisDecisionEvaluationSnapshot`, `IrisDecisionEvaluationProvider`, `IrisDecisionEvaluationEngine`; valutazione descrittiva; nessuno scoring finale
- **Decision Selection (11.3)** — `IrisDecisionSelection`, `IrisDecisionSelectionSnapshot`, `IrisDecisionSelectionProvider`, `IrisDecisionSelectionEngine`; dichiarazione di scelta; nessuna azione
- **Kill-switch decision** — `IRIS_DECISION_COMPONENT_ID = 'iris-decision'`; nessuna decisione/valutazione/selezione quando OFF; nessun comportamento adattivo

IRIS può **decidere**, **valutare** e **selezionare**, ma **NON può agire**.

---

## §3 — Ambito escluso (MUST NOT)

È **formalmente vietato** introdurre nel Decision Plane 11.x:

- **action** — nessuna azione eseguibile
- **execution** — nessuna esecuzione
- **delivery** — nessun collegamento diretto a delivery (solo consumo di tipi da barrel ammesso dove già presente)
- **command** — nessun comando
- **trigger** — nessun trigger
- **apply** — nessuna applicazione operativa
- **send** — nessun invio
- **bridging verso 10.x** — nessun collegamento che attivi execution/delivery da 11.x
- **feedback → action** — nessun uso del feedback per attivare azioni
- **auto-decision** — nessuna decisione automatica che attivi comportamenti
- **adaptive decision** — nessuna decisione adattiva
- **learning decision** — nessuna decisione che apprenda
- **optimization** — nessuna ottimizzazione operativa
- **prioritization operativa** — nessuna priorità che comandi execution o delivery

---

## §4 — Invarianti

Le seguenti invarianti **MUST** restare vere per IRIS 11.x:

- **Decision ≠ Action** — il Decision Plane **MUST** produrre solo artefatti dichiarativi; **MUST NOT** eseguire, inviare o attivare
- **Selection ≠ Execution** — la selezione **MUST** essere dichiarazione di scelta; **MUST NOT** essere comando verso execution o delivery
- **Evaluation ≠ Scoring finale** — la valutazione **MUST** essere annotazione/descrizione; **MUST NOT** essere giudizio che comanda azioni
- **Decision Plane è read-only verso il mondo** — **MUST NOT** mutare 9.x, 10.x, né attivare adapter o layer operativi
- **Nessun side-effect** — **MUST NOT** I/O, mutazione globale, persistenza, invio

---

## §5 — Relazione con altre fasi

- **9.x / 10.x rimangono congelate** — **MUST NOT** modificare interpretation, orchestration, messaging, rendering, governance, delivery, feedback
- **11.x consuma ma non produce effetti** — **MUST** trattare 9.x e 10.x come read-only; **MUST NOT** retroagire con comandi o trigger
- **12.x (se esisterà)** — **MUST** essere **esplicitamente dichiarata come Action Bridging**; **MUST NOT** essere introdotta come estensione implicita di 11.x

---

## §6 — Kill-switch

- **Kill-switch = nessuna decisione / valutazione / selezione** — quando OFF: artifact engine → `artifacts: []`; evaluation engine → `notes: []`; selection engine → `selections: []`
- **Nessun comportamento adattivo** — **MUST NOT** degradazione “intelligente”, fallback o output parziale quando OFF
- **Nessuna reazione automatica** — **MUST NOT** attivare/disattivare in risposta a eventi

---

## §7 — Anti-pattern vietati

È **formalmente vietato** introdurre o suggerire in documentazione o codice IRIS 11.x:

- **smartDecision** — **MUST NOT** decisione “intelligente” che agisca
- **actionDecision** — **MUST NOT** decisione che sia anche azione
- **decisionExecution** — **MUST NOT** unire decisione e esecuzione
- **autoApplyDecision** — **MUST NOT** applicazione automatica della decisione
- **recommendedAction** — **MUST NOT** raccomandazione di azione eseguibile
- **decisionPolicy** — **MUST NOT** policy che comandi execution/delivery
- **decisionAI** — **MUST NOT** AI che produca azioni
- **closedLoopDecision** — **MUST NOT** loop chiuso decisione → azione

---

## §8 — Dichiarazione notarile

**IRIS 11.x (Decision Plane) è definitivo e congelato.**

**IRIS può decidere, valutare e selezionare, ma non può agire.**

**Ogni estensione operativa richiede una nuova fase numerata.**

- Nessuna estensione in-place di 11.0, 11.1, 11.2, 11.3
- IRIS 11.x certificato come **Decision Support puro**: decide, valuta, seleziona; non esegue, non invia, non comanda
- Base sigillata per **fermarsi qui** (decision support) oppure per **IRIS 12.x — Action Bridging** (solo se esplicitamente dichiarata)

**VINCOLANTE. DEFINITIVO. CONGELATO.**

---

**Fine documento — IRIS 11.x Decision Plane Final Freeze.**
