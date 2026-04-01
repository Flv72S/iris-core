# Messaging System — Capability Model (Product Intelligence Layer)

**Documento:** Capability Model dichiarativo  
**Microstep:** C.1.5 — Capability Model (Product Intelligence Layer)  
**Stato:** Skeleton + tassonomia iniziale  
**Vincolo:** Product-level; **MUST NOT** dipendere da IRIS Core per esecuzione o decisione.

---

## §1 — Definizione

### Cos’è una Capability

Una **Capability** è un’unità **dichiarativa** che descrive **cosa** il sistema è in grado di fare, a livello di prodotto. È identificata da un tipo tassonomico (es. `summarize.text`, `semantic.search`) e da input/output e vincoli **dichiarativi**. Non specifica come, quando o con quali adapter.

- **Capability ≠ Feature** — La feature è ciò che l’utente vede o chiede; la capability è il blocco architetturale riusabile che la abilita (spesso in composizione con altre).
- **Capability ≠ Action** — L’action è un’unità di esecuzione (invio, persistenza); la capability è descrittiva e **MUST NOT** eseguire.
- **Capability ≠ Adapter** — L’adapter è un binding a canali/provider concreti; la capability **MUST NOT** conoscere adapter, canali o endpoint.
- **Capability ≠ Decision** — La decisione (cosa fare, quando, con quale priorità) appartiene a IRIS; la capability **MUST NOT** contenere logica decisionale.

---

## §2 — Ruolo nel sistema

Pipeline aggiornata:

```
IRIS Decision
  → Action Intent
    → Messaging Contract
      → Capability Model
        → Action Plan
          → Execution (esterno)
```

Il **Capability Model** si colloca tra Messaging Contract e Action Plan: fornisce il vocabolario stabile di “cosa il sistema può fare”, consumato dall’Action Plan Builder (C.2) per comporre piani **senza** esecuzione, scheduling o adapter inside il modello.

---

## §3 — Principi

- Le capability sono **verbi cognitivi o operativi astratti** (es. summarize, transcribe, search, store, filter).
- **Nessuna** capability conosce canali, provider, AI model, retry, SLA.
- Le killer feature sono **composizioni di capability**; non esiste una capability “per feature”.
- Le capability **NON** contengono logica: sono descrizioni con tipo, input, output e vincoli dichiarativi.

---

## §4 — Tassonomia iniziale (esempi)

Elenco **controllato ed estendibile** (namespace.type):

| Tipo | Descrizione semantica |
|------|------------------------|
| `summarize.text` | Sintesi di contenuto testuale |
| `summarize.voice` | Sintesi di contenuto vocale / TTS |
| `transcribe.voice` | Trascrizione voce → testo |
| `semantic.search` | Ricerca semantica su indici |
| `memory.store` | Memorizzazione dichiarativa (cosa salvare) |
| `memory.retrieve` | Recupero da memoria (cosa recuperare) |
| `attention.filter` | Filtro sull’attenzione utente (cosa mostrare/nascondere) |
| `attention.observe` | Osservazione contesto di attenzione |
| `intent.suggest` | Suggerimento di intent (dichiarativo) |
| `social.observe` | Osservazione contesto sociale |
| `delivery.defer` | Differimento dichiarativo della consegna |
| `context.link` | Collegamento contestuale (thread, entità) |

L’elenco è **estendibile** solo tramite aggiunta esplicita di nuovi tipi; **MUST NOT** essere esteso in modo implicito dall’Action Plan o da altri layer.

---

## §5 — Ambito escluso (MUST NOT)

- **Esecuzione** — Nessuna capability esegue azioni.
- **Scoring / Ranking / Selezione** — Nessuna capability assegna punteggi, rank o sceglie tra alternative.
- **Scheduling** — Nessuna capability pianifica quando eseguire.
- **Retry** — Nessuna capability gestisce retry o fallback.
- **Policy** — Nessuna capability contiene policy operative.
- **AI-specific logic** — Nessuna capability referenzia modelli, provider o SDK AI.
- **Closed loop** — Nessuna capability realizza loop di controllo o adattamento operativo.

---

## §6 — Anti-pattern (MUST NOT)

- **smartCapability** — Capability “intelligente” o adattiva.
- **adaptiveCapability** — Capability che modifica il proprio comportamento in base a contesto.
- **aiInsideCapability** — Logica o riferimento ad AI/model/provider dentro la capability.
- **executableCapability** — Capability che invoca esecuzione, invio o adapter.
- **capabilityPolicy** — Capability che incorpora policy (priorità, SLA, retry).

---

## §7 — Dichiarazione formale

> *“Il Capability Model descrive **cosa** il sistema può fare,*  
> *non **come** lo fa né **quando** lo fa.”*

---

## Riferimenti

- C.0 — Product Phase Opening: `docs/architecture/messaging-system-phase-opening.md`
- C.1 — Messaging Contract Interpreter: `src/messaging-system/contract/`
- C.2 — Action Plan Builder: consumer del Capability Model
