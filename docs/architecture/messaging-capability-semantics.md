# Messaging System — Capability Semantics (Meaning, not Execution)

**Documento:** Semantics Layer per le Capability  
**Microstep:** C.1.6 — Capability Semantics  
**Stato:** Dichiarativo; nessuna esecuzione, decisione o orchestrazione  
**Vincolo:** Significato strutturato; **MUST NOT** trasformare in azioni o decisioni.

---

## §1 — Cos’è la Capability Semantics

La **Capability Semantics** è il livello che **attribuisce significato strutturato** alle capability: dominio, categoria d’intento, input/output, effetti e vincoli dichiarativi. Non modifica il comportamento né l’esecuzione.

### Differenza tra i concetti

| Concetto | Definizione | Esempio |
|----------|-------------|---------|
| **Capability** | Unità dichiarativa di “cosa il sistema può fare” (tipo tassonomico). | `summarize.text`, `attention.filter` |
| **Capability Semantics** | Significato strutturato della capability: dominio, intent, input/output, effetti. | dominio: cognitive; effect: comprehension-enhancement |
| **Action** | Unità di esecuzione concreta (invio, persistenza). | Invio su canale, scrittura in DB |
| **Execution** | Realizzazione operativa di un’action (adapter, canali, retry). | Layer C.4+ |

**Semantics = *meaning*,** non **behavior**. La Semantics descrive *cosa significa* una capability, non *cosa fa* né *come* viene realizzata.

---

## §2 — Ruolo nel sistema

Pipeline aggiornata:

```
IRIS Decision
  → Action Intent
    → Messaging Contract
      → Capability Model
        → Capability Semantics
          → Action Plan Builder
            → Execution (esterno)
```

La **Capability Semantics** si colloca tra Capability Model e Action Plan Builder: arricchisce le capability con significato e contesto, permettendo a C.2 di comporre piani espressivi **senza** esecuzione, decisione o orchestrazione inside il layer.

---

## §3 — Cosa aggiunge la Semantics

- **Significato funzionale** — Cosa rappresenta la capability (es. trasformazione, osservazione, assistenza).
- **Dominio cognitivo** — Area di applicazione (cognitive, wellbeing, assistance, memory, social, delivery-support).
- **Tipo di trasformazione** — Input e output dichiarativi (es. textual-content → reduced-text).
- **Prerequisiti logici** — Vincoli e dipendenze dichiarative (senza esecuzione).
- **Impatto sul contesto** — Effetti dichiarativi (es. comprehension-enhancement, interruption-reduction).

Tutto **dichiarativo**; **MUST NOT** contenere logica di esecuzione, scoring, ranking o selezione.

---

## §4 — Esempi concreti

### `summarize.text`

- **dominio:** cognitive  
- **input:** textual-content  
- **output:** reduced-text  
- **effect:** comprehension-enhancement  

(⚠️ Nessun riferimento a canali, provider, modelli AI, retry, SLA.)

### `attention.filter`

- **dominio:** wellbeing  
- **effect:** interruption-reduction  

### `intent.suggest`

- **dominio:** assistance  
- **effect:** decision-support  

---

## §5 — Ambito escluso (MUST NOT)

- **Execution logic** — Nessuna logica che realizzi azioni.
- **Scoring / Ranking** — Nessun punteggio o ordinamento operativo.
- **Decision rules** — Nessuna regola che “sceglie” tra alternative.
- **AI prompting** — Nessun riferimento a prompt, modelli o provider AI.
- **Workflow** — Nessun flusso operativo o stato di macchina.
- **Scheduling** — Nessuna pianificazione temporale.
- **Priority** — Nessuna priorità operativa.
- **Adapter selection** — Nessuna scelta di adapter o canale.

---

## §6 — Anti-pattern (MUST NOT)

- **semanticExecution** — Usare la Semantics per attivare o guidare esecuzione.
- **semanticDecision** — Usare la Semantics per prendere decisioni (scelta, ranking).
- **aiSemanticEngine** — Integrare AI, modelli o provider nella Semantics.
- **smartSemantics** — Semantics “adattiva” o “intelligente” che modifica il comportamento.
- **adaptiveSemantics** — Semantics che cambia in base a contesto operativo.

---

## §7 — Dichiarazione formale

> *“La Capability Semantics descrive **cosa** una capability *significa*,*  
> *non **cosa** *fa* né **come** viene realizzata.”*

---

## Riferimenti

- Capability Model (C.1.5): `docs/architecture/messaging-capability-model.md`
- Semantics skeleton: `src/messaging-system/capabilities/semantics/`
- C.2 — Action Plan Builder: consumer di Capability + Semantics
