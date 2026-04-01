# Messaging System — Product Phase Opening

**Documento:** Phase Opening del Product Layer  
**Microstep:** C.0 — Product Phase Opening  
**Stato:** Messaging System in **Phase Opening**  
**Vincolo:** IRIS Core (9.x–12.x) è definitivo e congelato; **MUST NOT** essere modificato.

---

## Cos’è il Messaging System

Il **Messaging System** è il **prodotto finale** che:

- **MUST** consumare l’output di IRIS Core (Decision, Action Intent, Messaging Contract, Action Plan) come dato **dichiarativo**.
- **MUST** essere il solo layer che **agisce** verso il mondo esterno (invio, canali, adapter).
- **MUST NOT** contenere logica decisionale propria: le decisioni **MUST** provenire da IRIS.
- **MAY** interpretare contratti e piani d’azione e tradurli in esecuzione, **solo** nei microstep previsti.

IRIS = cognitive kernel. Messaging System = prodotto che esegue.

---

## Cos’è IRIS Core

**IRIS Core** (9.x–12.x) è il **nucleo cognitivo** congelato che:

- **MUST** fornire: Interpretation, Orchestration, Messaging (9.2), Rendering, Governance, Delivery (10.1), Feedback (10.2), Decision (11.x), Action Bridge (12.x).
- **MUST** limitarsi a **decidere**, **valutare**, **selezionare** e **dichiarare** intent e contratti.
- **MUST NOT** conoscere canali, adapter, retry, SLA, scheduling.
- **MUST NOT** eseguire azioni verso il mondo esterno.

---

## Relazione gerarchica

- **IRIS** → **decide** (artefatti, valutazione, selezione, intent, contract dichiarativi).
- **Messaging System** → **agisce** (interpreta contratti/piani ed esegue verso canali/adapter/mondo esterno).

La relazione **MUST** essere unidirezionale: IRIS in uscita, Messaging System in consumo ed esecuzione.

---

## Pipeline ufficiale

```
IRIS Decision
  → Action Intent
    → Messaging Contract
      → Action Plan
        → Execution
          → External World
```

- **IRIS Decision** e **Action Intent** / **Messaging Contract** (dichiarativi) appartengono a IRIS Core (fino al confine 12.x).
- **Messaging Contract** (interpretato) e **Action Plan** sono costruiti dal Product Layer (Messaging System).
- **Execution** e **External World** **MUST** appartenere al Messaging System o a sistemi da esso orchestrati, **MUST NOT** essere inside IRIS.

---

## Dichiarazione formale

> **IRIS non conosce canali, adapter, retry, SLA, scheduling.**

Ogni nozione operativa (canali, adapter, retry, SLA, scheduling) **MUST** risiedere nel Messaging System o a valle, **MUST NOT** essere introdotta in IRIS Core.

---

## Anti-pattern (MUST NOT)

- **embeddedDecision** — Nessuna logica decisionale embedded nel Messaging System che sostituisca IRIS.
- **smartRetry** — Nessun retry “intelligente” o policy di retry dentro IRIS.
- **adaptiveIRIS** — IRIS non si adatta operativamente; resta dichiarativo.
- **closedLoopIRIS** — Nessun loop chiuso di azione dentro IRIS (feedback come osservazione sì; esecuzione no).
- **actionInsideIRIS** — Nessuna esecuzione di azioni inside IRIS; l’azione è solo nel Messaging System / Execution.

---

## Riferimenti

- IRIS 12.x Action Bridge: `docs/architecture/iris-12.0-action-bridge-phase-opening.md`
- IRIS 12.x.F Final Freeze: `docs/architecture/iris-12.x-action-bridge-final-freeze.md`
- Microstep C.1: Messaging Contract Interpreter
