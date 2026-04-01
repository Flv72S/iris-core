# Execution Boundary & Adapter Contract

**Documento:** Confine formale tra dominio dichiarativo e dominio esecutivo  
**Microstep:** C.3 — Execution Boundary  
**Stato:** Contratto e interfacce; **nessuna** implementazione concreta  
**Vincolo:** C.3 **non** implementa esecuzione; definisce **le regole** con cui l’esecuzione può avvenire all’esterno.

---

## §1 — Cos’è l’Execution Boundary

L’**Execution Boundary** è un **contratto**, non un motore.

- **Definisce:**
  - cosa un Execution Engine **PUÒ** ricevere (es. ExecutionRequest con ActionPlanSnapshot)
  - cosa **PUÒ** restituire (es. ExecutionResult con stato per step)
- **Non definisce:**
  - come eseguire
  - quando eseguire
  - con quale tecnologia

È il **checkpoint di purezza architetturale**: tutto ciò che sta prima è dichiarativo; tutto ciò che sta dopo è operativo ed esterno.

---

## §2 — Action Plan come unico input valido

- L’Execution **riceve solo** **ActionPlanSnapshot** (tramite ExecutionRequest).
- **Nessun accesso** a:
  - IRIS Decision
  - Intent
  - Contract
  - Capability (modello)
  - Semantic

L’Execution **MUST NOT** leggere o dipendere da IRIS, contract, capability o semantic; **MAY** ricevere solo il piano (snapshot) e produrre un report di esecuzione.

---

## §3 — Adapter Contract

- **Adapter** = traduttore tecnico: traduce uno **ActionPlanStep** in effetti nel mondo reale (canale, API, DB, ecc.).
- **Adapter consuma:** ActionPlanStep (solo lo step, non il piano intero né altri contesti).
- **Adapter produce:** effetti nel mondo reale (invio, persistenza, chiamata API, ecc.).
- **Adapter non decide** — Non sceglie tra alternative né valuta intent.
- **Adapter non pianifica** — Non modifica il piano né genera nuovi step.
- **Adapter non valuta alternative** — Non fa scoring, ranking o selezione.

L’Adapter è **isolato** rispetto a IRIS, Intent, Contract, Decision.

---

## §4 — Execution Report (output consentito)

L’Execution **PUÒ** produrre **solo**:

- **stato** — success | failure | partial (per step o globale)
- **stepId** — identificatore dello step eseguito
- **timestamp** — quando è stato completato
- **errore tecnico** — opzionale, **non** semantico (es. codice errore, messaggio tecnico)

**MUST NOT:**

- influenzare IRIS
- cambiare piani
- generare nuovi intent
- attivare loop (retroazione verso il dominio cognitivo)

---

## §5 — Anti-pattern (MUST NOT)

- **smartExecutor** — Execution “intelligente” che decide o adatta.
- **adaptiveExecutor** — Execution che modifica il comportamento in base a contesto.
- **retryInsideIRIS** — Retry o fallback gestiti inside IRIS o dentro il confine dichiarativo.
- **feedbackDrivenPlanning** — Il piano viene modificato in base a feedback di esecuzione.
- **selfHealingIRIS** — IRIS che “guarisce” o riagisce in base a esiti di esecuzione.
- **aiExecutionEngine** — Logica AI o modelli inside il confine di esecuzione (l’AI può essere in un adapter esterno).
- **adapterWithContext** — Adapter che riceve o usa contesto IRIS, Intent, Contract, Decision.

---

## §6 — Dichiarazione formale

> *“L’Execution Boundary separa in modo **definitivo** il dominio cognitivo dal dominio operativo.*  
> *Ogni attraversamento è **unidirezionale**.”*

---

## Pipeline completa

```
IRIS Decision
  → Action Intent
    → Messaging Contract
      → Capability Model
        → Capability Semantics
          → Action Plan Builder
            → Execution Boundary  ← (QUI)
              → Execution Engine (esterno)
                → Adapter
                  → External World
```

---

## Riferimenti

- Action Plan: `src/messaging-system/action-plan/`
- Execution Boundary (tipi e interfacce): `src/messaging-system/execution-boundary/`
- Implementazioni concrete: sistemi esterni (WhatsApp, Telegram, Email, Voice, AI Agent, automazioni)
