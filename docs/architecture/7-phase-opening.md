# APERTURA FORMALE — FASE 7
## Wallet, Token & UX Contract Layer (BASE)

**Sistema:** IRIS  
**Fase:** 7 — Wallet, Token & UX Contract Layer (BASE)  
**Stato:** Apertura architetturale formale  
**Autorità:** Spec concettuale vincolante  
**Prerequisito:** Fase 6 — chiusa e congelata ([6-phase-official-closure.md](./6-phase-official-closure.md))

Questo documento ha **valore architetturale vincolante**. Definisce **scopo**, **perimetro**, **principi**, **anti-pattern** e **linguaggio normativo** della Fase 7. **Nessuna implementazione** è richiesta in questo step. Il documento **MUST** fungere da **guardrail** per tutti i documenti 7.x; **nessun** microstep 7.x **MUST** violarne i principi.

---

## 1. Contesto

Il sistema IRIS ha **completato formalmente** la **Fase 6 — Behavioral, Capability, Value & UX Safety Layer**. Tutti i blocchi 6.x sono **congelati** e **non modificabili**.

Si apre la **Fase 7**, che introduce il **Wallet & Token Layer (BASE)** e il **contratto di utilizzo MVP (API-first)**.

---

## 2. Nome e scopo della Fase 7 (VINCOLANTE)

**Nome:** **FASE 7 — Wallet, Token & UX Contract Layer (BASE)**

**Scopo della Fase 7 (unico e vincolante):**

> **Rendere l’economia e l’uso del sistema IRIS accessibili, sicuri e utilizzabili,  
> senza introdurre intelligenza, inferenza o comportamento adattivo.**

In particolare, la Fase 7:

- **espone** strumenti di utilizzo, **non** di decisione
- **definisce** contratti, **non** strategie
- **abilita** partecipazione, **non** manipolazione

---

## 3. Responsabilità della Fase 7

### 3.1 La Fase 7 PUÒ includere

- **Wallet** — logico e/o UX-facing
- **Token / saldo / storico transazioni**
- **Binding *soft*** tra identità e wallet (reversibile)
- **Meccanismi di sicurezza** — minimi e dichiarativi
- **Contratti di lettura per la UI** — API-first
- **Read models** ottimizzati per UX
- **Astrazioni tecniche** del wallet nel core

### 3.2 La Fase 7 NON PUÒ includere

- **AI**
- **suggerimenti**
- **automazioni**
- **adattività**
- **inferenza comportamentale**
- **decisioni** basate su Behavioral Memory
- **attivazione automatica** di feature

Qualsiasi introduzione degli elementi in §3.2 **VIOLA** il perimetro della Fase 7 e **richiede** **nuova fase** o revisione architetturale formale.

---

## 4. Posizionamento architetturale

La Fase 7 è:

- **successiva** alla Fase 6 — **MUST** rispettare tutti i vincoli e invarianti della Fase 6
- **subordinata** ai vincoli di:
  - **Privacy Guard** (6.2.3)
  - **Capability Registry** (6.3.1)
  - **Feature Tier Mapping** (6.3.2)
  - **Kill-Switch globale** (6.3.3)
- **neutra** rispetto al dominio conversazionale — **MUST NOT** osservare né modificare il dominio in base a contenuti o contesto

**Isolamento:**

- Il **dominio non dipende** dalla Fase 7
- La Fase 7 **non osserva** il dominio (nessuna lettura di Behavioral Memory, snapshot o valore per decisioni)

---

## 5. Principi vincolanti

I seguenti principi sono **VINCOLANTI** per tutti i microstep 7.x:

### 5.1 Wallet ≠ Intelligenza

Il wallet è uno **strumento passivo**. **MUST NOT** decidere, **MUST NOT** suggerire, **MUST NOT** interpretare. **MUST** esporre solo dati e contratti di lettura/scrittura dichiarati.

### 5.2 Economia come partecipazione

Ogni movimento di valore **MUST** essere:

- **esplicito** — nessun trasferimento implicito o “automatico”
- **tracciabile** — traccia tecnica e auditabile
- **reversibile a livello concettuale** — nessun lock-in irreversibile sul valore

### 5.3 UX-first, non UX-driven

La Fase 7 **espone** contratti per la UX (API-first, read models), ma **MUST NOT**:

- decidere **cosa** mostrare
- attivare **nulla** autonomamente

La UX **consuma** i contratti; la Fase 7 **non** guida la UX.

### 5.4 Fail-safe totale

In caso di **errore**:

- **nessuna** azione **MUST** essere eseguita
- **nessun** side-effect **MUST** essere prodotto
- **nessuna** esposizione di dati sensibili **MUST** avvenire

Comportamento atteso: **no-op** o **fall-back sicuro**; **MUST NOT** procedere con operazioni parziali o compensative non dichiarate.

---

## 6. Anti-pattern VIETATI (BLOCCANTI)

È **VIETATO** introdurre in Fase 7:

- **logiche di reward dinamico** — nessun calcolo di reward, incentivo o premio basato su comportamento o contesto
- **gamification** — nessun punteggio, livello, badge, achievement legato al wallet o al token
- **suggerimenti economici** — nessun “consiglio” su come usare saldo, token o storico
- **ranking utenti** — nessuna lista ordinata per valore, attività o merito
- **nudging comportamentale** — nessun invito implicito a modificare comportamento tramite economia o UX
- **decisioni basate su storico o contesto** — nessuna logica che usi storico transazioni o contesto per decidere cosa mostrare o fare
- **wallet che “parla” o “consiglia”** — nessun messaggio, hint o copy generato dal layer wallet/token
- **coupling diretto con Behavioral Memory (6.2)** — la Fase 7 **MUST NOT** leggere 6.2 per decisioni; eventuale uso **MUST** essere esplicito, documentato e limitato a read-only per scopi non decisionali

**Qualsiasi violazione richiede nuova fase** o revisione architetturale formale con nuovo documento vincolante.

---

## 7. Microstep attesi (NON ESAUSTIVI)

La Fase 7 **potrà** includere microstep come:

- **7.1.x** — Identity & Wallet Binding (soft, reversibile)
- **7.2.x** — Wallet & Balance Model
- **7.3.x** — Transaction History
- **7.4.x** — Security & Safeguard minimi
- **7.5.x** — UX Contract (API-first, read-only)

L’**ordine** e il **contenuto** dei microstep saranno definiti **successivamente**. Ogni microstep **MUST** conformarsi a questo documento; **MUST NOT** estendere il perimetro della Fase 7, **solo** specializzarlo.

---

## 8. Linguaggio normativo

I documenti della Fase 7 **MUST** usare:

- **MUST** / **MUST NOT**
- **VIETATO**
- **VINCOLANTE**
- **FAIL-SAFE**

**Nessun** linguaggio esplorativo, ambiguo o non committente. Le specifiche **MUST** essere **prescrittive** e **verificabili** a livello concettuale.

---

## 9. Definition of Conceptual Done — Apertura Fase 7

La Fase 7 è considerata **formalmente aperta** quando:

- [ ] **Questo documento è creato e congelato** — il documento `7-phase-opening.md` esiste ed è dichiarato vincolante
- [ ] **Funge da guardrail** per tutti i documenti 7.x — nessun microstep 7.x **MUST** violarne scopo, principi o anti-pattern
- [ ] **Nessun microstep 7.x può violarne i principi** — ogni documento 7.x **MUST** riferirsi a questo documento e **MUST** rispettarne i vincoli

---

## 10. Clausola di congelamento

Una volta **congelato** questo documento:

- il **perimetro** della Fase 7 **non è modificabile** senza revisione architetturale formale
- i microstep 7.x **possono solo specializzare**, **mai** estendere il perimetro (aggiungere AI, suggerimenti, automazioni, inferenza, ecc.)
- **ogni deviazione** dai principi o dagli anti-pattern **richiede** **nuova fase** o **revisione architetturale formale** con documento dedicato

Questo documento è la **fonte di verità architetturale** per l’apertura della Fase 7. Le implementazioni future **MUST** conformarvisi.

---

**Fine del Documento di Apertura Formale della Fase 7.**
