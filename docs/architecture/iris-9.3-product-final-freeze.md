# IRIS 9.3 — Product Final Freeze
## Chiusura definitiva del prodotto IRIS

**Microstep:** 9.3.F — Product Final Freeze  
**Fase:** IRIS 9 — Product Layer (chiusura)  
**Natura:** Freeze definitivo · Nessuna feature · Nessuna modifica ai layer esistenti  
**Prerequisiti:** 9.0, 9.1, 9.2, 9.2.F, 9.3 implementati e congelati

---

## §1 — Stato del documento

- Il presente documento è **VINCOLANTE**, **DEFINITIVO** e **CONGELATO** — **MUST** essere rispettato da ogni uso o integrazione di IRIS; **MUST NOT** essere aggirato o reinterpretato
- **IRIS 9.3.x è CHIUSO** — tutti i layer da 9.0 a 9.3 sono **definitivi** e **non estendibili** in-place
- **Ogni modifica richiede una nuova fase architetturale numerata (IRIS 10.x o nuova famiglia)** — estensioni concettuali o funzionali **MUST** essere realizzate come nuova versione maggiore (10.x, 11.x, …) o nuova famiglia di prodotto; **MUST NOT** essere retroattive su IRIS 9.x

---

## §2 — Ambito completo di IRIS

IRIS **ESISTE** end-to-end come segue. Elencazione **esplicita** di ciò che è incluso:

- **Semantic Engine Core (8.2.x)** — dipendenza esterna, **non** di proprietà del prodotto IRIS; fornisce `SemanticSnapshot` e vocabolario; IRIS **consuma** snapshot, **non** modifica il core
- **Interpretation Layer (9.0)** — `IrisInterpretation`, `IrisInterpretationModel`, `IrisInterpreter`, `IrisInterpretationEngine`; input `SemanticSnapshot`; output modello con interpretazioni multiple; nessuna decisione
- **Orchestration Layer (9.1)** — `IrisOrchestrationResult`, `IrisOrchestrator`, `IrisOrchestrationEngine`; kill-switch `iris-orchestration`; input snapshot + interpretation model; output elenco risultati dichiarativi
- **Messaging & Channel Binding (9.2)** — `IrisChannel`, `IrisMessageEnvelope`, `IrisMessageBinding`, `IrisMessagingEngine`; kill-switch `iris-messaging`; input snapshot + interpretation model + orchestration results; output binding per canale
- **Rendering / UX Delivery (9.3)** — `IrisRenderTemplate`, `IrisRenderedContent`, `IrisRenderResult`, `IrisRenderingEngine`; kill-switch `iris-rendering`; input `IrisMessageBinding[]`; output artefatti UX renderizzati per canale

IRIS nel suo insieme:

- **consuma** snapshot semantici (da 8.2.x)
- **produce** contenuti UX renderizzati (fino a 9.3)
- **NON** agisce sul mondo esterno (nessun invio, nessun side-effect)

---

## §3 — Ambito escluso (confini invalicabili)

IRIS **NON include** e **NON includerà** nella famiglia 9.x:

- **Decision making** — nessuna scelta, risoluzione conflitti, “risultato finale”
- **Selezione finale** — nessun filtro prescrittivo, “migliore N”, canale o interpretazione “vincente”
- **Policy enforcement** — nessuna applicazione di policy che alteri dati o output
- **Priorità di canale** — nessuna nozione di canale “principale” o “prioritario”
- **Invio / dispatch / publish** — nessun side-effect di consegna, invio reale, publish
- **Adapter infrastrutturali** — nessun adapter di rete, coda, storage
- **Provider email / push / webhook** — nessun provider di consegna reale
- **Scheduling / retry / delivery guarantees** — nessuna logica di ritentativi, garanzie di consegna, scheduling
- **Analytics o feedback loop** — nessun tracciamento, metriche o feedback che retroagiscano sui layer IRIS

Tutto quanto sopra **MUST** vivere **fuori** da IRIS (es. in Colibrì, in adapter esterni, in IRIS 10.x se rilevante).

---

## §4 — Invarianti architetturali

Le seguenti invarianti **MUST** restare vere per IRIS 9.x per tutto il ciclo di vita del freeze:

- **Append-only** — i layer accumulano; **MUST NOT** eliminare o filtrare informazione in modo decisionale
- **Nessuna eliminazione di informazione** — interpretazioni e risultati sono preservati (o l’intero layer è disattivato da kill-switch)
- **Nessuna interpretazione vincente** — **MUST NOT** designare “la” interpretazione migliore o finale
- **Nessun “risultato finale”** — **MUST NOT** produrre un singolo output “finale” o “per l’utente” a livello di prodotto
- **Determinismo e side-effect free** — tutti i layer sono deterministici e **MUST NOT** avere side-effect (I/O, mutazione esterna)
- **Kill-switch → degradazione, mai trasformazione** — quando un kill-switch è OFF, l’output è **vuoto** (o neutro dichiarato); **MUST NOT** introdurre output parziale, alternativo o “fallback intelligente”

---

## §5 — Kill-switch Matrix IRIS

| Component ID | Layer | Effetto quando OFF |
|-------------|--------|---------------------|
| *(nessuno)* | **iris-interpretation** (9.0) | Con zero interpreter registrati: `IrisInterpretationModel` con `interpretations: []`. Nessuna eccezione, nessun fallback. |
| **iris-orchestration** | Orchestration (9.1) | `orchestrate()` → `[]`. Snapshot e interpretation model invariati. |
| **iris-messaging** | Messaging (9.2) | `bind()` → `[]`. Snapshot, model e orchestration results invariati. |
| **iris-rendering** | Rendering (9.3) | `render()` → `[]`. Bindings invariati. |

Regola unica: **OFF → output vuoto**; **mai** output parziale o alternativo.

---

## §6 — Separazione dal Semantic Engine

- Il **Semantic Engine (8.2.x)** è **fondazione comune multi-prodotto** — può servire IRIS, Colibrì e altri consumatori
- **IRIS è consumatore** — dipende **solo** da tipi e da `SemanticSnapshot` / `createEmptySnapshot` esposti dal barrel del semantic-layer
- **Nessuna dipendenza inversa ammessa** — il semantic-layer **MUST NOT** dipendere da IRIS; **MUST NOT** esserci import da IRIS verso semantic-layer/engine oltre al barrel pubblico (tipi e snapshot)

---

## §7 — Anti-pattern vietati (lista esplicita)

È **VIETATO** introdurre o suggerire, in documentazione o codice che riguardi IRIS 9.x:

- **“Messaggio finale”** — **MUST NOT** presentare l’output come messaggio “finale” o “pronto per l’utente”
- **“Canale principale”** — **MUST NOT** definire un canale come “principale” o “preferito”
- **“Template consigliato”** — **MUST NOT** usare “consigliato” come scelta del sistema
- **“Interpretazione migliore”** — **MUST NOT** identificare un’interpretazione come “migliore” o “vincente”
- **“Utente vedrà”** — **MUST NOT** prescrivere cosa “l’utente vedrà” come risultato di una decisione IRIS
- **“Contenuto selezionato”** — **MUST NOT** presentare un contenuto come “selezionato” dal sistema
- **“Decisione del sistema”** — **MUST NOT** attribuire decisioni o scelte a IRIS
- **Side-effect mascherati** — **MUST NOT** introdurre invio, persistenza o I/O sotto copertura di “rendering” o “delivery”

---

## §8 — Dichiarazione notarile finale

**IRIS 9.3 è definitivo, completo e congelato.**

**Ogni estensione funzionale o concettuale richiede una nuova fase architetturale numerata.**

**Questo documento chiude formalmente IRIS come prodotto.**

- Nessuna estensione in-place di 9.0, 9.1, 9.2, 9.3
- Nessuna reinterpretazione dei contratti prodotto
- IRIS certificato come **pipeline cognitiva end-to-end**: da snapshot semantici a contenuti UX renderizzati, **senza decisioni**, **senza invio**, **senza side-effect**
- Base sigillata per **integrazione esterna** (Colibrì, senders, adapters, provider) — tutti **fuori** da IRIS

**VINCOLANTE. DEFINITIVO. CONGELATO.**

---

**Fine documento — IRIS 9.3 Product Final Freeze.**
