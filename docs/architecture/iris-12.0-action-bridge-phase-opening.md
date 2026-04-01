# IRIS 12.0 — Action Bridge Phase Opening

**Documento:** Phase Opening architetturale  
**Fase:** 12.0 — Action Bridge (Declaration → Intent, no Execution)  
**Stato:** IRIS 12.0 in **Phase Opening**  
**Natura:** Confine dichiarativo · Nessuna esecuzione · Nessun side-effect

---

## Stato: IRIS 12.0 in Phase Opening

La Fase 12.x è **formalmente aperta**. Il layer **Action Bridge** è introdotto come:

- **Confine architetturale** tra Decision Selection (11.x) e Execution (esterna)
- **Traduzione dichiarativa** da selezione a *Action Intents*
- **NON** un motore operativo: nessuna esecuzione, invio, delivery, adapter, side-effect

---

## Definizione di Action Intent

Un **Action Intent** è un **dato dichiarativo** che esprime *cosa sarebbe coerente fare* in base a una selezione decisionale, **senza**:

- impartire comandi
- attivare esecuzione
- inviare messaggi
- schedulare, ritentare o prioritizzare operativamente

**Proprietà consentite (esemplificative):**

| Proprietà   | Tipo   | Descrizione                                      |
|------------|--------|--------------------------------------------------|
| intentId   | string | Identificatore univoco dell’intent               |
| selectionId| string | Riferimento alla selezione da cui deriva         |
| intentType | string | Tipo dichiarativo (es. categorizzazione)         |
| description| string | Descrizione testuale                             |
| constraints| opaco  | Vincoli read-only (opzionale)                    |
| metadata   | opaco  | Metadati read-only (opzionale)                   |
| derivedAt  | string | Timestamp di derivazione                         |

**Proprietà vietate (MUST NOT):**  
`execute`, `send`, `trigger`, `command`, `adapter`, `delivery`, `retry`, `priority`, `schedule`, e qualsiasi altra che implichi esecuzione o policy operativa.

---

## Tabella di separazione

| Livello         | Responsabile     | Contenuto                                      | Esecuzione |
|-----------------|------------------|------------------------------------------------|------------|
| **Decision**    | IRIS 11.1–11.2   | Artefatti, valutazioni                         | No         |
| **Selection**   | IRIS 11.3        | Cosa è stato scelto (dichiarativo)             | No         |
| **Action Intent** | IRIS 12.x     | Cosa sarebbe coerente fare (dichiarativo)       | No         |
| **Execution**   | Sistema esterno  | Invio, delivery, adapter, side-effect          | Sì         |

- **Decision** e **Selection** restano in 11.x; **Action Intent** è 12.x; **Execution** **MUST NOT** essere in IRIS 12.x.

---

## Ambito consentito

- **Consumare** `IrisDecisionSelectionSnapshot` (11.x) come unico input dichiarativo.
- **Derivare** una lista di `IrisActionIntent` (read-only, frozen).
- **Esporre** `IrisActionIntentSnapshot` (intents + derivedAt) come output.
- **Kill-switch:** se OFF → snapshot con `intents: []`.
- **Aggregazione:** somma degli intent di tutti i provider (nessuna deduplicazione né selezione finale).
- **Immutabilità:** tutti gli oggetti esposti **MUST** essere frozen.

---

## Ambito escluso (MUST NOT)

- **Eseguire** qualsiasi azione.
- **Inviare** messaggi o chiamare delivery.
- **Attivare** adapter, canali o retry.
- **Importare** da: IrisDeliveryEngine, IrisFeedbackEngine, governance, adapter di messaging.
- **Contenere** nei tipi: execute, send, trigger, command, adapter, delivery, retry, priority, schedule.
- **Deduplicare** o **validare** semanticamente gli intent (solo accumulo).
- **Mutare** stato, I/O, logging operativo, chiamate esterne.

---

## Invarianti

1. **Decision ≠ Action Intent ≠ Execution** — i tre livelli restano separati.
2. **Solo input da 11.x** — l’Action Bridge legge solo `IrisDecisionSelectionSnapshot` (e tipi 11.x).
3. **Output dichiarativo** — solo `IrisActionIntent` / `IrisActionIntentSnapshot`; nessun comando.
4. **Nessun side-effect** — nessuna mutazione, I/O o esecuzione nel layer 12.x.
5. **Intent ≠ comando** — gli intent descrivono coerenza con la selezione, non istruzioni eseguibili.

---

## Relazione con 11.x e 13.x

- **11.x:** Fornisce Decision Artifacts, Evaluation, Selection. L’Action Bridge **consuma** solo Selection (e contesto 11.x). Nessuna modifica a 11.x.
- **12.x:** Action Bridge come confine: Selection → Action Intents. Nessuna esecuzione.
- **13.x (futuro):** Potrà occuparsi di integrazione con Execution/Delivery **esterni**; 12.x resta dichiarativo.

---

## Anti-pattern espliciti (MUST NOT)

- **smartAction** — nessuna “azione intelligente” nel bridge.
- **autoExecuteIntent** — nessuna esecuzione automatica.
- **recommendedAction** — intent non è raccomandazione esecutiva.
- **actionPolicy** — nessuna policy operativa nel bridge.
- **workflowEngine** — nessun motore di workflow.
- **retryIntent** — nessuna semantica di retry.
- **scheduledIntent** — nessuna schedulazione.
- **adaptiveAction** — nessuna adattività operativa.
- **closedLoopAction** — nessun loop chiuso di azione.

---

## Dichiarazione formale notarile

> **IRIS 12.0 introduce l’Action Bridge come confine dichiarativo tra Decision e Execution.**  
> **L’Action Bridge NON agisce.**  
> **Ogni esecuzione richiede un sistema esterno.**

---

## Riferimenti

- Contract Messaging (11.C): `docs/architecture/iris-messaging-contract.md`
- Decision Plane (11.x): snapshot 11.1–11.3
- Futura Fase 13.x: integrazione con Execution/Delivery (esterni)
