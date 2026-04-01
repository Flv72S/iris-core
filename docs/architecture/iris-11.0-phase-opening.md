# IRIS 11.0 — Phase Opening
## Decision Plane

**Documento:** Phase Opening  
**Fase:** IRIS 11.0  
**Nome:** Decision Plane  
**Natura:** Fondazionale, VINCOLANTE  
**Prerequisiti:** IRIS 9.x congelato, 10.x Execution & Observation congelato

---

## §1 — Stato

- **IRIS 11.0 è in Phase Opening** — **MUST** essere rispettato da ogni estensione del Decision Plane
- **Nessuna funzionalità decisionale operativa introdotta** — si introduce **solo** il confine architetturale, il vocabolario e lo skeleton del layer; **MUST NOT** introdurre comportamento decisionale operativo in questo microstep
- **Ogni estensione richiede microstep successivi (11.1, 11.2, …)** — Decision Artifacts, policy, criteri **MUST** essere trattati in prompt e deliverable distinti

---

## §2 — Definizione di Decision

**Decision** è definita come:

- **artefatto dichiarativo** — un dato che descrive un esito cognitivo, non un’azione
- **risultato cognitivo** — output di un processo di valutazione/aggregazione dichiarato
- **non un’azione** — **MUST NOT** essere confusa con l’esecuzione di qualcosa
- **non un comando** — **MUST NOT** essere interpretata come comando verso delivery o adapter
- **non un trigger** — **MUST NOT** attivare automaticamente execution, delivery o governance

**Decision ≠ Execution ≠ Delivery ≠ Governance**

| Decision (11.x) | Execution (10.1) | Delivery (10.1) | Governance (10.0) |
|-----------------|------------------|----------------|-------------------|
| Artefatto dichiarativo | Applicazione meccanica | Adattamento verso esterni | Abilitazione / osservazione |
| Risultato cognitivo | Nessuna scelta | Nessuna scelta | Nessuna scelta |
| Non azione | Esegue ciò che gli viene passato | Boundary verso sistemi | Read-only |

---

## §3 — Motivazione

La decisione viene formalizzata per:

- **evitare decisioni implicite** — **MUST NOT** nascondere scelte in interpretation, orchestration, rendering o delivery
- **evitare selezioni nascoste** — **MUST** rendere esplicito quando e dove avviene un atto decisionale
- **rendere auditabile l’atto decisionale** — **MUST** poter tracciare cosa è stato “deciso” come artefatto separato da esecuzione e delivery
- **separare responsabilità cognitive e operative** — **MUST** mantenere il Decision Plane come layer che produce solo artefatti; Execution e Delivery **MUST** restare meccanici e non decisionali

---

## §4 — Ambito consentito

Il Decision Plane **PUÒ**:

- **consumare** output di Interpretation (9.0), Orchestration (9.1), Messaging (9.2), Rendering (9.3), Feedback (10.2) — solo tramite tipi e barrel pubblici
- **produrre Decision Artifacts dichiarativi** — snapshot, modelli, risultati che descrivono “cosa è stato deciso” senza eseguire nulla
- **essere soggetto a kill-switch** — **MUST** supportare `IRIS_DECISION_COMPONENT_ID` e registry read-only; quando OFF **MUST** restituire output vuoto o neutro
- **essere auditabile** — **MUST** produrre output immutabili e tracciabili; **MUST NOT** introdurre side-effect o mutazione

---

## §5 — Ambito escluso (MUST NOT)

È **formalmente vietato** nel Decision Plane (e **MUST NOT** essere introdotto in nome della “decisione”):

- **esecuzione** — **MUST NOT** eseguire codice operativo
- **delivery** — **MUST NOT** inviare, dispatchare o attivare adapter di delivery
- **side-effect** — **MUST NOT** I/O, mutazione globale, persistenza
- **selezione automatica di contenuti** — **MUST NOT** filtrare o scegliere “cosa mostrare” in modo operativo (l’artefatto può descrivere una selezione; non può applicarla)
- **attivazione di adapter** — **MUST NOT** chiamare delivery adapter o feedback adapter
- **ranking, scoring, optimization** — **MUST NOT** introdurre in questo microstep; eventuali criteri **MUST** essere in microstep successivi (11.1+)
- **feedback → action loop** — **MUST NOT** usare feedback per attivare azioni o cambiare comportamento
- **apprendimento o adattamento** — **MUST NOT** apprendere o adattarsi; **MUST** restare deterministico e dichiarativo

---

## §6 — Relazione con 9.x e 10.x

- **9.x e 10.x restano congelati** — **MUST NOT** modificare interpretation, orchestration, messaging, rendering, governance, delivery, feedback
- **11.x è un layer sovrapposto** — consuma output di 9.x e 10.x; **MUST NOT** essere dipeso da 9.x o 10.x (nessuna dipendenza inversa)
- **Nessuna dipendenza inversa ammessa** — 9.x e 10.x **MUST NOT** importare da 11.x; 11.x **MAY** importare solo tipi da barrel pubblici di 9.x e 10.x

---

## §7 — Anti-pattern

È **formalmente vietato** introdurre o suggerire in documentazione o codice IRIS 11.x:

- **decisionEngine che invia** — **MUST NOT** unire decisione e invio/delivery nello stesso componente
- **bestChoice** — **MUST NOT** esporre “migliore scelta” come proprietà operativa
- **recommendedAction** — **MUST NOT** raccomandare azioni eseguibili
- **autoDecision** — **MUST NOT** decisione automatica che attiva comportamenti
- **adaptiveDecision** — **MUST NOT** decisione che si adatta a feedback
- **learningDecision** — **MUST NOT** decisione che apprende
- **smartDecision** — **MUST NOT** attribuire “intelligenza” alla decisione in modo che diventi esecutiva
- **closedLoopDecision** — **MUST NOT** loop chiuso tra feedback e decisione che modifica esecuzione

---

## §8 — Dichiarazione formale

**IRIS 11.0 apre formalmente il Decision Plane.**

**Nessuna decisione ha effetto operativo.**

**Ogni evoluzione richiede microstep numerati.**

- Nessuna modifica a 9.x o 10.x
- Solo confine architetturale, vocabolario e skeleton
- Base per **11.1 — Decision Artifacts** e microstep successivi

**VINCOLANTE. PHASE OPENING. NESSUN COMPORTAMENTO DECISIONALE OPERATIVO.**

---

**Fine documento — IRIS 11.0 Phase Opening.**
