# IRIS Product Demo — Scenario Narrative

## Demo Narrative (Foundation Artifact)

### Scopo

Questo file definisce la **Demo Narrative ufficiale** del prodotto IRIS.

**NON è:**

- una specifica tecnica
- un flusso UI dettagliato
- un test

**È:**

- una **narrazione strutturata**
- scenario-driven
- usata come **guida vincolante** per:
  - Feature Pipelines (C.7)
  - Feature Orchestrator (C.8)
  - Product Modes (C.9)
  - Demo UI

---

## Principi guida della demo

- La demo mostra **come il sistema pensa**, non come "fa magie"
- Ogni stato è:
  - spiegabile
  - leggibile
  - coerente
- Nessuna azione autonoma
- Nessuna decisione nascosta
- Nessuna UI "furba"

> La demo deve poter essere raccontata **a voce**, senza click compulsivi.

---

## Architettura implicita (NON implementare qui)

```
IRIS Core
→ Messaging System
→ UX State Projection (C.6)
→ UX Experience Interpretation (C.6.5)
→ Feature Pipelines (C.7)
→ Feature Orchestrator (C.8)
→ Product Mode (C.9)
→ UI Demo
```

---

## Struttura della demo

La demo è composta da **3 scenari indipendenti**.

Ogni scenario definisce:

- contesto iniziale
- segnali chiave
- UX Experience State atteso
- feature visibili
- comportamento percepito dall'utente

---

# SCENARIO 1 — Focus Attivo

## Contesto

L'utente:

- è in una sessione di lavoro
- ha attivato il **Focus Mode**
- riceve input multipli (messaggi, notifiche)

Il sistema **NON deve**:

- interrompere
- decidere al posto dell'utente
- agire automaticamente

---

## Segnali di sistema (astratti)

- UX State include:
  - `FOCUS_ACTIVE`
  - eventuali `ACTION_PENDING` non urgenti

---

## UX Experience State atteso

- **label**: FOCUSED
- **confidenceBand**: medium o high
- **suggestedLens**: focus
- **explanation**:
  > "You are currently in a focused work session. Non-essential interactions are minimized."

---

## Feature visibili (demo)

- **Smart Inbox**
  - messaggi non urgenti raggruppati
  - nessuna notifica invasiva
- **Focus Guard**
  - indicazione chiara che il focus è attivo

---

## Percezione utente

> "Il sistema capisce che sono concentrato e si adatta senza disturbarmi."

---

# SCENARIO 2 — Attesa Risposta

## Contesto

L'utente:

- ha inviato un messaggio
- è in attesa di una risposta
- non ha segnali di errore o blocco

---

## Segnali di sistema (astratti)

- UX State include:
  - `WAITING_REPLY`
  - o `ACTION_PENDING`
- Nessun `DELIVERY_FAILED`

---

## UX Experience State atteso

- **label**: WAITING
- **confidenceBand**: medium
- **suggestedLens**: neutral
- **explanation**:
  > "You are waiting for a response. No action is required at the moment."

---

## Feature visibili (demo)

- **Smart Inbox**
  - conversazione marcata come "in attesa"
- **Status Insight**
  - indicazione passiva dello stato

---

## Percezione utente

> "So cosa sta succedendo, senza dover controllare continuamente."

---

# SCENARIO 3 — Blocco Wellbeing

## Contesto

L'utente:

- riceve input ripetitivi
- o notifiche fallite
- o segnali di overload

Il sistema **NON deve**:

- bloccare azioni
- forzare comportamenti
- suggerire decisioni

---

## Segnali di sistema (astratti)

- UX State include:
  - `WELLBEING_BLOCK`
  - o `DELIVERY_FAILED`
  - oppure molti segnali simultanei

---

## UX Experience State atteso

- **label**: BLOCKED
- **confidenceBand**: low o medium
- **suggestedLens**: wellbeing
- **explanation**:
  > "Multiple signals detected. It may be helpful to pause or reduce input."

---

## Feature visibili (demo)

- **Wellbeing Gate**
  - indicazione di overload
  - nessuna azione forzata
- **Smart Inbox**
  - riduzione densità informativa

---

## Percezione utente

> "Il sistema mi rende consapevole, non mi controlla."

---

## Vincoli della Demo (MUST)

- **Nessuna feature**:
  - prende decisioni
  - esegue azioni
  - modifica lo stato del sistema
- **Tutto è**:
  - read-only
  - spiegabile
  - coerente con UX State ed Experience

---

## Output richiesto (per gli step successivi)

Questo file è usato come:

- riferimento per **C.7 — Feature Pipelines**
- base per **C.8 — Feature Orchestrator**
- guida per **C.9 — Product Modes**
- copione della demo UI

**NON** duplicare logica.  
**NON** introdurre nuove feature fuori da questi scenari.

---

## Dichiarazione finale

Questa Demo Narrative definisce **il comportamento osservabile del prodotto**.

Ogni implementazione successiva deve essere coerente con questi scenari.
