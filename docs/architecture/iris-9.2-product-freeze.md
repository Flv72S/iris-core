# IRIS 9.2 — Product Freeze
## Interpretation, Orchestration, Messaging — Congelamento formale

**Microstep:** 9.2.F — Product Freeze  
**Fase:** IRIS 9 — Product Layer  
**Natura:** Freeze formale · Nessuna feature · Nessuna modifica ai layer congelati  
**Prerequisiti:** 8.2.x (Semantic Engine Core congelato), 9.0, 9.1, 9.2 implementati

---

## §1 — Stato del documento

- Il presente documento è **VINCOLANTE** — **MUST** essere rispettato da ogni uso o estensione di IRIS fino al Messaging; **MUST NOT** essere aggirato o reinterpretato
- **IRIS 9.2 è CONGELATO** — i layer Interpretation (9.0), Orchestration (9.1), Messaging (9.2) sono **definitivi** e **non estendibili** in-place
- **Ogni modifica richiede IRIS 10.x o nuova fase numerata** — estensioni concettuali o funzionali **MUST** essere realizzate come nuova versione maggiore (10.x, 11.x, …) o nuova fase architetturale; **MUST NOT** essere retroattive su 9.0–9.2

---

## §2 — Ambito congelato

IRIS 9.2 include **esclusivamente** i seguenti layer. Descriviamo cosa **ESISTE**, non cosa “serve”.

- **Interpretazione (9.0)** — `IrisInterpretation`, `IrisInterpretationModel`, `IrisInterpreter`, `IrisInterpretationEngine`; input `SemanticSnapshot`; output modello con interpretazioni multiple; nessuna decisione, nessuna selezione
- **Orchestrazione (9.1)** — `IrisOrchestrationPlan`, `IrisOrchestrationResult`, `IrisOrchestrator`, `IrisOrchestrationEngine`; kill-switch `iris-orchestration`; input snapshot + interpretation model; output elenco risultati dichiarativi; nessuna selezione, nessun “canale principale”
- **Messaging & Channel Binding (9.2)** — `IrisChannel`, `IrisMessageEnvelope`, `IrisMessageBinding`, `IrisMessagingEngine`; kill-switch `iris-messaging`; input snapshot + interpretation model + orchestration results; output binding per canale; preparazione alla consegna, **NON** invio reale, **NON** testo/copy/template

---

## §3 — Ambito escluso

**NON fanno parte di IRIS 9.2** e **MUST NOT** essere introdotti retroattivamente in 9.0–9.2:

- **Rendering** — nessun rendering di messaggi, card o UI
- **Copy / tone / template** — nessun testo utente finale, titolo, body, tone of voice, template
- **Decisioni** — nessuna scelta, selezione finale, “migliore” interpretazione
- **Priorità** — nessuna priorità decisionale tra canali o interpretazioni
- **Canale principale** — nessuna nozione di canale “principale” o “raccomandato”
- **Invio reale** — nessun side-effect send, dispatch, publish
- **UX / UI / ViewModel** — nessuna UX, UI, ViewModel, presentation semantics, output utente finale

---

## §4 — Invarianti architetturali

Le seguenti invarianti **MUST** restare vere per IRIS 9.2 (9.0–9.2) per tutto il ciclo di vita del freeze:

- **Nessuna decisione** — nessun layer sceglie, risolve conflitti o produce “risultato finale”
- **Nessuna selezione** — nessun filtro, scarto o “migliore N”; accumulo dichiarativo
- **Nessuna eliminazione di dati** — interpretazioni e risultati **MUST** essere preservati negli output (o esclusi solo per kill-switch dell’intero layer)
- **Accumulo dichiarativo** — orchestrazione e messaging accumulano; **MUST NOT** fondere o deduplicare in modo semantico
- **Determinismo** — stesso input **MUST** produrre stesso output
- **Side-effect free** — nessun invio, nessuna mutazione di snapshot o dati 8.2.x
- **Separazione totale dal Semantic Engine Core** — IRIS 9.x **MUST** dipendere da 8.2.x **solo** per `SemanticSnapshot` e tipi (vocabulary); **MUST NOT** accedere a engine, ranking, explanations, aggregazione

---

## §5 — Kill-switch boundary

- I kill-switch **disabilitano interi layer** — orchestration OFF → `[]`; messaging OFF → `[]`; nessuna esecuzione parziale
- **NON** alterano snapshot o dati sottostanti — lo snapshot e i modelli restano invariati; i kill-switch **MUST** solo far restituire output vuoto o neutro
- **NON** producono fallback “intelligenti” — **MUST NOT** introdurre logica di fallback, canale alternativo o “migliore” quando OFF; **MUST** solo restituire `[]` o equivalente dichiarato

---

## §6 — Confine con 9.3+

- **9.3 (e successive)** possono **solo consumare** l’output di 9.2 (binding, risultati, interpretazioni); **MUST NOT** modificare né reinterpretare i contratti 9.0–9.2
- **MUST NOT** introdurre semantica retroattiva — **MUST NOT** attribuire a 9.0–9.2 significati (es. “finale”, “principale”, “raccomandato”) non presenti nei contratti congelati
- Eventuali estensioni (rendering, UX, invio) **MUST** vivere in **9.3+** o **IRIS 10.x**, senza alterare 9.2

---

## §7 — Anti-pattern vietati

È **VIETATO** introdurre o suggerire, in documentazione o codice che riguardi IRIS 9.2:

- **“Messaggio finale”** — **MUST NOT** presentare l’output come messaggio “finale” o “pronto per l’utente”
- **“Interpretazione migliore”** — **MUST NOT** identificare un’interpretazione come “migliore” o “vincente”
- **“Canale principale”** — **MUST NOT** definire un canale come “principale” o “preferito”
- **“Raccomandato”** (prescrittivo) — **MUST NOT** usare “raccomandato” come scelta del sistema
- **“Perché IRIS ha scelto”** — **MUST NOT** attribuire decisioni o scelte a IRIS
- **Linguaggio UX mascherato** — **MUST NOT** introdurre copy, tone o narrative che prescrivano comportamento sotto copertura di “interpretazione” o “binding”

---

## §8 — Dichiarazione notarile

**IRIS 9.2 (Interpretation, Orchestration, Messaging) è definitivo, congelato e non estendibile.**

**Ogni modifica concettuale o funzionale richiede una nuova versione maggiore di IRIS.**

- Nessuna estensione in-place di 9.0, 9.1, 9.2
- Nessuna reinterpretazione dei contratti prodotto
- IRIS 9.2 certificato come **engine cognitivo preparatorio**, non decisionale né UX-driven
- Base sigillata per **9.3 Rendering / UX Delivery** o **IRIS 10.x**

**VINCOLANTE. CONGELATO. NON ESTENDIBILE.**

---

**Fine documento — IRIS 9.2 Product Freeze.**
