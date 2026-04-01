# IRIS — Messaging System Contract
## Phase 11.C — Confine architetturale IRIS Core ↔ Messaging System

**Documento:** Contract architetturale vincolante  
**Fase:** 11.C — Messaging System Contract  
**Natura:** Dichiarativo · Nessuna logica · Nessuna implementazione di delivery  
**Prerequisiti:** IRIS 9.x–11.x congelato (fino a 11.x.F)

---

## Scopo del contract

Definire un **contract formale e vincolante** tra:

- **IRIS Core** (Interpretation, Orchestration, Messaging 9.2, Rendering, Governance, Delivery 10.1, Feedback 10.2, Decision 11.0–11.3)
- **Messaging System** (delivery, channels, AI content — fuori da IRIS)

Il contract **MUST**:

- dichiarare cosa IRIS **PUÒ** fornire al Messaging System
- dichiarare cosa IRIS **MUST NOT** fornire
- rendere il Messaging System **consumer puro** (potente ma non decisionale)
- rendere IRIS consumabile come **Decision Core**
- preparare la futura Fase 12.x (Action Bridging) senza implementarla

Il contract **MUST NOT** introdurre nuova logica, delivery, action o execution.

---

## Posizionamento architetturale

```
┌─────────────────────────────────────────────────────────────┐
│  Messaging System (esterno)                                   │
│  delivery · channels · AI content · invio reale              │
└──────────────────────────▲──────────────────────────────────┘
                           │ contract (solo snapshot decisionali)
                           │ read-only · MUST NOT action/trigger/send
┌──────────────────────────┴──────────────────────────────────┐
│  IRIS Core (Decision Core)                                   │
│  9.x Interpretation → Orchestration → Messaging → Rendering  │
│  10.x Governance · Delivery · Feedback                       │
│  11.x Decision Artifacts · Evaluation · Selection            │
└─────────────────────────────────────────────────────────────┘
```

- **IRIS Core** **MAY** fornire al Messaging System un **IrisDecisionContractSnapshot** (aggregato read-only di snapshot decisionali 11.1–11.3).
- **Messaging System** **MUST** consumare il contract come dato dichiarativo; **MUST NOT** pretendere che il contract contenga comandi, azioni o trigger.
- **Il confine** **MUST** essere blindato: nessun output operativo (action, send, execute, trigger) attraversa il contract.

---

## Responsabilità IRIS

- **IRIS MUST** fornire solo **snapshot decisionali** (artifact set, evaluation snapshot, selection snapshot) tramite il contract.
- **IRIS MUST** garantire che il contract sia **read-only**, **frozen** e **senza proprietà operative**.
- **IRIS MUST NOT** fornire tramite il contract: azioni, comandi, trigger, invii, priorità operative, timing, retry, canali da attivare.
- **IRIS MUST NOT** implementare delivery, execution o action nel contract (Fase 12.x se e quando dichiarata).

---

## Responsabilità Messaging System

- **Messaging System MAY** consumare `IrisDecisionContractSnapshot` per conoscere decisioni, valutazioni e selezioni dichiarate.
- **Messaging System MUST** interpretare il contract come **dato dichiarativo**; **MUST NOT** assumere che il contract contenga istruzioni eseguibili.
- **Messaging System MUST NOT** richiedere a IRIS azioni, invii o trigger; **MUST** trattare IRIS come **Decision Core** (solo output cognitivi).
- **Messaging System MAY** implementare delivery, canali e AI content **al di fuori** di IRIS, usando il contract come input informativo.

---

## Output consentiti

Tramite il contract, IRIS **MAY** esporre **solo**:

- **IrisDecisionArtifactSet** (11.1) — artefatti decisionali dichiarativi
- **IrisDecisionEvaluationSnapshot** (11.2) — note di valutazione descrittive
- **IrisDecisionSelectionSnapshot** (11.3) — selezioni dichiarate
- **derivedAt** — timestamp di derivazione

Tutti **read-only**, **frozen**, **senza semantica operativa**.

---

## Output vietati (MUST NOT)

Il contract **MUST NOT** contenere o esporre:

- **action** — nessuna azione
- **command** — nessun comando
- **trigger** — nessun trigger
- **send** — nessun invio
- **execute** — nessuna esecuzione
- **delivery** — nessun collegamento diretto a delivery
- **channel** — nessuna indicazione di canale da attivare
- **timing** — nessun timing operativo
- **retry** — nessuna politica di retry
- **priority operativa** — nessuna priorità che comandi il Messaging System
- **recommendedAction** — nessuna raccomandazione di azione
- **nextStep** — nessun passo successivo eseguibile

---

## Kill-switch semantics

- Quando il **kill-switch decision** (11.x) è **OFF**, gli snapshot decisionali **MUST** essere vuoti (artifacts: [], notes: [], selections: []).
- Il contract **MUST** riflettere tale stato: **MUST NOT** inventare dati o fallback quando gli snapshot sono vuoti.
- **MUST NOT** comportamento adattivo o degradazione “intelligente” in risposta al kill-switch.

---

## Anti-pattern espliciti

È **vietato** nel contract o nell’uso del contract:

- **contractAsCommand** — trattare il contract come comando
- **inferActionFromSelection** — inferire un’azione diretta dalla selezione (la selezione è dichiarazione, non istruzione)
- **contractTrigger** — usare il contract come trigger per invio
- **deliveryFromContract** — eseguire delivery basandosi su campi del contract come se fossero operativi
- **priorityFromContract** — applicare priorità operative derivate dal contract
- **retryFromContract** — derivare retry o timing dal contract
- **channelFromContract** — scegliere canale da attivare in base al contract (il contract **MUST NOT** contenere channel)

---

## Invarianti architetturali

- **Contract = dato dichiarativo** — **MUST NOT** essere interpretato come insieme di istruzioni.
- **IRIS = Decision Core** — **MUST** fornire solo output cognitivi (decisioni, valutazioni, selezioni dichiarate).
- **Messaging System = consumer** — **MUST** consumare il contract senza pretendere azioni da IRIS.
- **Nessun side-effect attraverso il contract** — **MUST NOT** flusso di comandi, trigger o invii da IRIS verso il Messaging System tramite il contract.
- **Confine blindato** — **MUST** essere verificabile con test di conformità (proprietà vietate, import vietati, immutabilità).

---

## Relazione con 11.x.F e futura 12.x

- **11.x.F** — Decision Plane è congelato; IRIS può decidere, valutare e selezionare, ma **non può agire**. Il contract **MUST** rispettare tale freeze: **MUST NOT** introdurre azione, execution o delivery.
- **Futura 12.x (Action Bridging)** — **MAY** essere dichiarata in seguito per collegare in modo esplicito decisioni/selezioni a azioni o delivery. Il contract 11.C **MUST NOT** prefigurare tale collegamento; **MUST** restare puramente dichiarativo.
- **Nessuna ambiguità** — il contract rende chiaro che fino a 11.x (e 11.C) IRIS **MUST NOT** agire; ogni estensione operativa **MUST** passare da una fase 12.x esplicita.

---

## Linguaggio normativo

- **MUST** — obbligo assoluto
- **MUST NOT** — divieto assoluto
- **SHOULD** — raccomandazione forte
- **MAY** — consentito, non obbligatorio

**Fine documento — IRIS Messaging System Contract (11.C).**
