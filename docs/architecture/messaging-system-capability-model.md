# Messaging System — Product Capability Model (Strato 1)

**Documento:** Modello formale delle Product Capability  
**Microstep:** C.1.5 — Product Capability Model (Strato 1)  
**Stato:** Baseline per Strato 1  
**Vincoli:** Nessuna modifica a `src/iris/**` né a `src/messaging-system/**`. Solo documentazione.

---

## §1 — Scopo del Capability Model

Questo documento definisce il **vocabolario operativo** del Messaging System allo Strato 1, in modo che l’Action Plan (C.2) sia **capability-driven** e non feature-driven, e che IRIS Core resti **completamente privo** di execution, retry, scheduling e logica adapter.

### Differenza tra Feature, Capability, Action

| Concetto | Definizione | Esempio |
|----------|-------------|---------|
| **Feature** | Cosa l’utente vede o chiede; esigenza di prodotto. | “Smart Inbox Zero”, “Assistente Vocale” |
| **Capability** | Cosa il sistema **può fare** in modo dichiarativo; blocco architetturale riusabile. | MessagePrioritization, VoiceInteraction |
| **Action** | Unità di esecuzione concreta (invio, persistenza, notifica). | Invio su canale, scrittura in log |

- Le **feature** sono **emergenze**: combinazioni di capability + contesto utente.
- Le **capability** sono **contratto architetturale**: stabili, finite, estendibili solo per fase.
- Le **action** appartengono al piano di esecuzione (C.4), **MUST NOT** essere definite inside IRIS.

### Dichiarazione chiave

> *“Le capability descrivono **cosa** il sistema può fare,*  
> *non **quando**, non **come**, non **perché**.”*

---

## §2 — Principi architetturali

- **Capability ≠ Feature** — Le capability sono blocchi semantici; le feature sono combinazioni orientate all’utente.
- **Capability ≠ Action Plan** — L’Action Plan **compose** capability; le capability non sono piani.
- **Capability ≠ Adapter** — Le capability non conoscono canali, protocolli o adapter concreti.
- **Capability ≠ Execution** — Le capability producono output **dichiarativi**; l’esecuzione è a valle (C.4).
- **IRIS non conosce le capability** — IRIS **MUST NOT** referenziare capability; fornisce solo Decision, Intent, Contract.
- **Le capability consumano** Action Intent e Messaging Contract — Il Product Layer mappa intent/contract su capability; non il contrario.

### Anti-pattern (MUST NOT)

- **featureDrivenPlan** — Progettare l’Action Plan a partire da una singola feature invece che da capability.
- **actionPerFeature** — Associare una action esecutiva diretta a una feature, bypassando il modello capability.
- **adapterInCapability** — Inserire riferimenti ad adapter, canali o endpoint nella definizione di una capability.
- **decisionInsideProduct** — Portare logica decisionale (scelta, ranking, policy) dentro il Product Layer; **MUST** restare in IRIS.
- **smartCapability** — Attribuire “intelligenza” o decisione autonoma a una capability; le capability sono **dichiarative**.

---

## §3 — Elenco delle Product Capability (Strato 1)

Elenco **finito, stabile, estendibile** per Strato 1. Ogni capability è **dichiarativa**: input e output sono descrizioni, non esecuzioni.

---

### MessageComposition

- **Nome:** MessageComposition  
- **Descrizione semantica:** Composizione di contenuti messaggio (testo, allegati, riferimenti) a partire da descrittori e vincoli.  
- **Input dichiarativi attesi:** Messaging Contract con `messageKind`, `payloadDescriptor`, `constraints`.  
- **Output dichiarativi prodotti:** Descrizione di messaggio pronto per la successiva fase (non invio).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente contenuto oltre i vincoli dichiarati.

---

### MessageDelivery

- **Nome:** MessageDelivery  
- **Descrizione semantica:** Trasporto dichiarativo del messaggio verso un destinatario/canale (descrizione di “cosa consegnare”, non esecuzione fisica nello Strato 1).  
- **Input dichiarativi attesi:** Contratto di messaggio e destinatario/canale come identificatori dichiarativi.  
- **Output dichiarativi prodotti:** Specifica di delivery (cosa, dove, vincoli); l’esecuzione è demandata all’Execution Plane.  
- **MUST NOT:** Inviare messaggi direttamente; conoscere adapter concreti; fare retry; schedulare; decidere autonomamente.

---

### MessagePresentation

- **Nome:** MessagePresentation  
- **Descrizione semantica:** Modo in cui il messaggio è presentato all’utente (formato, layout, contesto visivo/uditivo).  
- **Input dichiarativi attesi:** Contenuto messaggio, preferenze di presentazione, contesto utente (dichiarativi).  
- **Output dichiarativi prodotti:** Descrizione di presentazione (template, modalità, ordinamento).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente.

---

### MessageTiming

- **Nome:** MessageTiming  
- **Descrizione semantica:** Vincoli e descrittori temporali associati al messaggio (quando mostrare, quando considerare scaduto).  
- **Input dichiarativi attesi:** Contratto con vincoli temporali; contesto di tempo dichiarativo.  
- **Output dichiarativi prodotti:** Specifica di timing (finestre, scadenze) come dato dichiarativo.  
- **MUST NOT:** Schedulare esecuzioni; inviare; conoscere adapter; fare retry; decidere autonomamente.

---

### MessagePrioritization

- **Nome:** MessagePrioritization  
- **Descrizione semantica:** Assegnazione di priorità/ordine dichiarativi ai messaggi (ranking, urgenza descrittiva).  
- **Input dichiarativi attesi:** Insieme di messaggi/contratti; criteri di priorità (da IRIS o policy dichiarative).  
- **Output dichiarativi prodotti:** Ordine/priorità dichiarativi; nessuna esecuzione di invio o filtro operativo.  
- **MUST NOT:** Inviare; conoscere adapter; fare retry; schedulare; decidere autonomamente (la decisione di priorità **MUST** provenire da IRIS o da policy dichiarative).

---

### ConversationContexting

- **Nome:** ConversationContexting  
- **Descrizione semantica:** Associare messaggi a contesto conversazionale (thread, partecipanti, stato conversazione).  
- **Input dichiarativi attesi:** Messaging Contract; identificatori di conversazione/thread.  
- **Output dichiarativi prodotti:** Arricchimento contestuale dichiarativo (etichette, relazioni).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente.

---

### UserAttentionManagement

- **Nome:** UserAttentionManagement  
- **Descrizione semantica:** Gestione dichiarativa dell’attenzione utente (notifiche da mostrare, silenzi, focus).  
- **Input dichiarativi attesi:** Intent/contract relativi a notifiche e preferenze utente; contesto di attenzione.  
- **Output dichiarativi prodotti:** Specifica di quando/come attirare attenzione (dichiarativo).  
- **MUST NOT:** Inviare notifiche direttamente; conoscere adapter; fare retry; schedulare; decidere autonomamente.

---

### ContentTransformation

- **Nome:** ContentTransformation  
- **Descrizione semantica:** Trasformazione dichiarativa del contenuto (sintesi, traduzione, formattazione).  
- **Input dichiarativi attesi:** Contenuto sorgente; tipo di trasformazione richiesta (da contract/intent).  
- **Output dichiarativi prodotti:** Descrizione del contenuto trasformato o della trasformazione da applicare.  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente il tipo di trasformazione (deve essere dichiarato da IRIS/contract).

---

### VoiceInteraction

- **Nome:** VoiceInteraction  
- **Descrizione semantica:** Interazione vocale in ingresso/uscita (voice-to-text, text-to-voice, comandi vocali) come capacità dichiarativa.  
- **Input dichiarativi attesi:** Contratto/intent con `messageKind` o tipo vocale; stream o riferimento a contenuto vocale.  
- **Output dichiarativi prodotti:** Descrizione di input/output vocale (trascrizione, sintesi, comando) come dato.  
- **MUST NOT:** Inviare messaggi; conoscere adapter concreti; fare retry; schedulare; decidere autonomamente.

---

### MetadataEnrichment

- **Nome:** MetadataEnrichment  
- **Descrizione semantica:** Arricchimento dichiarativo di metadati (tag, entità, provenienza, consenso).  
- **Input dichiarativi attesi:** Messaging Contract; contesto; policy di arricchimento (dichiarative).  
- **Output dichiarativi prodotti:** Set di metadati arricchiti (dichiarativo).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente.

---

### UserConsentHandling

- **Nome:** UserConsentHandling  
- **Descrizione semantica:** Gestione dichiarativa del consenso utente (raccolta, revoca, scope).  
- **Input dichiarativi attesi:** Richiesta di consenso; stato consensi; policy (dichiarative).  
- **Output dichiarativi prodotti:** Esito o descrizione dell’operazione di consenso (dichiarativo).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente (rispetto alla policy).

---

### ActivityLogging

- **Nome:** ActivityLogging  
- **Descrizione semantica:** Registrazione dichiarativa di attività (eventi, accessi, azioni) per audit e analisi.  
- **Input dichiarativi attesi:** Eventi/azioni da registrare; schema di log (dichiarativo).  
- **Output dichiarativi prodotti:** Descrizione di log/evento da persistere (dichiarativo).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente cosa loggare (deve essere dichiarato).

---

### SearchIndexing

- **Nome:** SearchIndexing  
- **Descrizione semantica:** Indicizzazione e ricerca dichiarative (indicizzare contenuti, eseguire query semantiche come descrizione).  
- **Input dichiarativi attesi:** Contenuti da indicizzare; query o criteri di ricerca (dichiarativi).  
- **Output dichiarativi prodotti:** Descrizione di indici/risultati di ricerca (dichiarativo).  
- **MUST NOT:** Inviare messaggi; conoscere adapter; fare retry; schedulare; decidere autonomamente cosa indicizzare o restituire (criteri da IRIS/contract).

---

## §4 — Mapping Killer Feature → Capability

Mapping **molti-a-molti**. Per ogni feature: capability coinvolte, ruolo IRIS, ruolo Messaging System, assenza di execution in IRIS.

| Killer Feature | Capability coinvolte | Ruolo IRIS | Ruolo Messaging System | Execution in IRIS |
|----------------|----------------------|------------|------------------------|-------------------|
| AI Smart-Summary (testo + vocali) | ContentTransformation, VoiceInteraction, MessagePresentation | Decision / evaluation / selection / intent su cosa riassumere e come | Composizione sintesi, presentazione, eventuale TTS; execution a valle | NO |
| Assistente Vocale Smart-Summary | VoiceInteraction, ContentTransformation, MessagePresentation, UserAttentionManagement | Decision / intent su priorità e modalità risposta | Gestione input/output vocale, presentazione; execution a valle | NO |
| Deep Search semantica | SearchIndexing, MetadataEnrichment, ConversationContexting | Decision / evaluation su rilevanza; intent di ricerca | Indicizzazione, query, contesto; execution a valle | NO |
| Digital Wellbeing – Gatekeeper | UserAttentionManagement, MessageTiming, MessagePrioritization, UserConsentHandling | Decision / selection su quando e cosa mostrare | Applicazione gate, timing, consenso; execution a valle | NO |
| Second Brain (indicizzazione locale) | SearchIndexing, ActivityLogging, MetadataEnrichment | Decision / intent su cosa indicizzare e classificare | Indicizzazione, log, metadati; execution a valle | NO |
| Ghost Assistant operativo | MessageComposition, MessageDelivery (dichiarativo), ConversationContexting, UserConsentHandling | Decision / intent su azioni e messaggi | Composizione e delivery dichiarativi; execution a valle | NO |
| Anti-Ghosting & Clarity | MessagePresentation, ConversationContexting, UserAttentionManagement, MessagePrioritization | Decision / evaluation / selection su chiarezza e priorità | Presentazione e contesto; execution a valle | NO |
| Social Coach avanzato | ContentTransformation, MessagePresentation, UserAttentionManagement, ActivityLogging | Decision / evaluation / intent su suggerimenti e tono | Trasformazione e presentazione; execution a valle | NO |
| AI sintesi & riassunti thread | ContentTransformation, MessagePresentation, ConversationContexting | Decision / selection / intent su cosa riassumere | Sintesi e presentazione; execution a valle | NO |
| Voice-to-Text & trascrizione vocali | VoiceInteraction, ContentTransformation, MetadataEnrichment | Decision / intent su lingua e formato | Trascrizione e metadati; execution a valle | NO |
| Messaggi con metadati & automazioni | MetadataEnrichment, MessageComposition, MessageTiming, UserConsentHandling | Decision / intent su automazioni e consenso | Arricchimento e composizione; execution a valle | NO |
| Smart Inbox Zero (AI prioritizer) | MessagePrioritization, MessagePresentation, UserAttentionManagement, MessageTiming | Decision / evaluation / selection su priorità e ordine | Applicazione priorità e presentazione; execution a valle | NO |
| Voice-First Mode | VoiceInteraction, MessagePresentation, UserAttentionManagement, MessagePrioritization | Decision / intent su modalità e priorità vocali | Input/output vocale e presentazione; execution a valle | NO |
| Daily Focus Mode | MessageTiming, MessagePrioritization, UserAttentionManagement, UserConsentHandling | Decision / selection su focus e finestre temporali | Timing e attenzione; execution a valle | NO |
| AI Life Log & Search universale | SearchIndexing, ActivityLogging, MetadataEnrichment, ContentTransformation | Decision / evaluation / intent su cosa loggare e cercare | Indicizzazione, log, ricerca; execution a valle | NO |

---

## §5 — Relazione con Action Plan (C.2)

- Un **Action Plan** è una **composizione di capability**: l’Action Plan Builder (C.2) **MUST** produrre un piano che referenzia solo capability di questo modello.
- Le capability **NON** scelgono: non contengono logica di selezione o ranking.
- Le capability **NON** orchestrano: non decidono ordine o flusso esecutivo.
- Le capability **NON** hanno stato decisionale: sono blocchi dichiarativi con input/output ben definiti.

### Cosa C.2 può assumere come garantito grazie a questo modello

- **Vocabolario stabile:** C.2 può usare i nomi delle capability (MessageComposition, MessageDelivery, …) come contratti di composizione.
- **Nessuna execution in capability:** C.2 compone solo descrizioni; nessuna capability invia, ritenta o schedulà.
- **Separazione da IRIS:** C.2 riceve Messaging Contract e (opzionalmente) intent; non deve interpretare decisioni IRIS, solo mappare su capability.
- **Estendibilità controllata:** Nuove capability richiedono una nuova fase; C.2 non introduce capability implicite.
- **Mapping feature → capability:** C.2 può essere guidato dal mapping §4 per capire quali capability servono a una data feature, senza essere feature-driven nel design.

---

## §6 — Confini e Freeze

- Questo Capability Model è **baseline per Strato 1**. Ogni riferimento ad “Action Plan” o “capability” nel Messaging System **SHOULD** allinearsi a questo elenco.
- Ogni **nuova feature** **MUST**:
  - mappare su capability **esistenti** (vedi §4), oppure
  - proporre una **nuova capability** in una **nuova fase** (non nello Strato 1).
- **Nessuna** capability **MUST** essere introdotta **implicitamente** in C.2: ogni capability usata in C.2 **MUST** essere presente in questo documento (o in un suo aggiornamento formale).

---

## §7 — Dichiarazione finale

> *“Il Product Capability Model dello Strato 1 definisce il vocabolario operativo del Messaging System.*  
> *Le feature sono emergenze.*  
> *Le capability sono contratto architetturale.”*

---

## Riferimenti

- C.0 — Product Phase Opening: `docs/architecture/messaging-system-phase-opening.md`
- C.1 — Messaging Contract Interpreter: `src/messaging-system/contract/`
- C.2 — Action Plan Builder (successivo step): deriverà Action Plan Snapshot da Messaging Contract + questo Capability Model.
