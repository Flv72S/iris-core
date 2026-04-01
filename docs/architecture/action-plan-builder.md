# Action Plan Builder (Declarative Operational Planning)

**Documento:** Confine finale del dominio cognitivo prima dell’esecuzione  
**Microstep:** C.2 — Action Plan Builder  
**Stato:** Dichiarativo; nessuna esecuzione, decisione, routing, adapter, AI  
**Vincolo:** Descrive **cosa** deve essere fatto, non **come** né **da chi**.

---

## §1 — Cos’è un Action Plan

Un **Action Plan** è un **piano operativo dichiarativo**: una sequenza logica di step che descrivono **cosa deve avvenire**, senza specificare come né chi lo esegue.

### Differenza tra i concetti

| Concetto | Definizione | Esempio |
|----------|-------------|---------|
| **Intent** | Dichiarazione di “cosa sarebbe coerente fare” (IRIS). | Action Intent con intentType, description |
| **Contract** | Contratto messaggistico dichiarativo (messageKind, payloadDescriptor). | Messaging Contract |
| **Capability** | Unità di “cosa il sistema può fare” (tipo tassonomico). | summarize.text, attention.filter |
| **Semantic** | Significato strutturato della capability (dominio, effetti). | domain: cognitive; effect: comprehension-enhancement |
| **Action Plan** | Descrizione operativa astratta: sequenza di step con traceability a intent/contract. | Piano con steps, expectedEffects, contractIds |

**Action Plan = descrizione operativa astratta**: nessuna esecuzione, nessuna scelta di canale/adapter/provider.

---

## §2 — Cosa contiene un Action Plan

- **Sequenza logica di step** — Ogni step referenzia una capability e una semantic (stepId, capabilityType, semanticId, inputs, outputs, effects).
- **Input/output dichiarativi** — Per ogni step: inputs e outputs come identificatori dichiarativi.
- **Effetti attesi** — Lista di effetti (es. comprehension-enhancement) senza logica operativa.
- **Dipendenze semantiche** — Step possono dichiarare dipendenze (dependencies) tra step.
- **Traceability** — planId, intentId, contractIds collegano il piano a intent e contratti.

Tutto **dichiarativo** e **immutabile**.

---

## §3 — Cosa NON contiene (vincolante)

Un Action Plan **MUST NOT** contenere:

- **adapter** — Nessun riferimento ad adapter concreti.
- **channel** — Nessun canale (WhatsApp, email, ecc.).
- **endpoint** — Nessun URL o endpoint di invio.
- **modello AI** — Nessun riferimento a modelli (GPT, ecc.).
- **retry** — Nessuna policy di retry.
- **SLA** — Nessun SLA operativo.
- **priority** — Nessuna priorità esecutiva.
- **schedule** — Nessuna schedulazione temporale.
- **scoring** — Nessun punteggio o ranking.

---

## §4 — Esempi concreti

### Esempio valido

- **planStep:** `summarize.text`
- **input:** `thread.messages`
- **output:** `summary.text`
- **semanticEffect:** `comprehension-enhancement`

(Descrizione dichiarativa; nessun canale, modello o retry.)

### Esempio vietato

- channel = whatsapp  
- model = gpt-4  
- retry = 3  

(Questi **MUST NOT** apparire in un Action Plan.)

---

## §5 — Relazione con Execution Engine

- L’**Execution** è **esterno** al dominio cognitivo e all’Action Plan Builder.
- L’Execution **interpreta** il piano e decide come realizzarlo (adapter, canali, retry).
- L’Execution **può fallire** senza che IRIS o l’Action Plan Builder ricevano feedback operativo; il confine resta dichiarativo.

---

## §6 — Anti-pattern (MUST NOT)

- **smartPlan** — Piano “intelligente” o adattivo.
- **adaptivePlan** — Piano che modifica se stesso in base al contesto.
- **executingPlan** — Piano che esegue o invoca esecuzione.
- **aiPlanEngine** — Logica AI o modelli dentro il builder.
- **selfHealingPlan** — Piano con retry, fallback o healing operativo.

---

## §7 — Dichiarazione formale

> *“L’Action Plan descrive **cosa** deve avvenire,*  
> *non **come** avviene né **chi** lo esegue.”*

---

## Riferimenti

- Messaging Contract: `src/messaging-system/contract/`
- Capability Model: `src/messaging-system/capabilities/`
- Capability Semantics: `src/messaging-system/capabilities/semantics/`
- Execution Engine: esterno (layer successivo)
