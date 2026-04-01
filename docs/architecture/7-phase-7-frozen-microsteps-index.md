# Microstep Congelati — Fase 7
## Elenco vincolante

**Fase:** 7 — Participation, Wallet & UX Contract Layer (BASE)  
**Titolo:** Microstep Congelati — Fase 7  
**Stato:** ELENCO VINCOLANTE  
**Natura:** Documento di riferimento architetturale  
**Ambito:** Solo microstep formalmente congelati

---

## 1. Elenco Microstep Congelati

---

### 7.1.1 — Soft Identity Binding

- **Codice Microstep:** 7.1.1
- **Titolo:** Soft Identity Binding
- **Blocco:** 7.1 — Identity & Participation
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Definizione del binding esplicito, non esclusivo e reversibile tra identity reference e wallet; nessuna strong identity né profiling.
- **Documento di riferimento:** [7.1.1-soft-identity-binding.md](./7.1.1-soft-identity-binding.md)

---

### 7.1.2 — Participation State

- **Codice Microstep:** 7.1.2
- **Titolo:** Participation State
- **Blocco:** 7.1 — Identity & Participation
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Definizione degli stati partecipativi espliciti, osservabili e reversibili (active, limited, suspended); event-driven, non inferiti da comportamento.
- **Documento di riferimento:** [7.1.2-participation-state.md](./7.1.2-participation-state.md)

---

### 7.2.1 — Wallet Core Abstraction

- **Codice Microstep:** 7.2.1
- **Titolo:** Wallet Core Abstraction
- **Blocco:** 7.2 — Wallet & Balance Layer
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Definizione del wallet come oggetto passivo, agnostico e non decisionale; uso governato da regole esterne (7.1.1, 7.1.2).
- **Documento di riferimento:** [7.2.1-wallet-core-abstraction.md](./7.2.1-wallet-core-abstraction.md)

---

### 7.2.2 — Balance & Availability

- **Codice Microstep:** 7.2.2
- **Titolo:** Balance & Availability
- **Blocco:** 7.2 — Wallet & Balance Layer
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Definizione tecnica e dichiarativa del saldo e della disponibilità come stato derivato e neutro; distinzione tra total, available e reserved balance; nessuna semantica economica, comportamentale o percettiva.
- **Documento di riferimento:**
  - [7.2.2-balance-availability.md](./7.2.2-balance-availability.md)
  - [7.2.2-freeze-balance-availability.md](./7.2.2-freeze-balance-availability.md)

---

### 7.2.3 — Transaction History (event-derived)

- **Codice Microstep:** 7.2.3
- **Titolo:** Transaction History (event-derived)
- **Blocco:** 7.2 — Wallet & Balance Layer
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Definizione della storia dei movimenti di valore come vista derivata da eventi, immutabile e auditable; esposizione UX-friendly e non interpretativa.
- **Documento di riferimento:** [7.2.3-transaction-history.md](./7.2.3-transaction-history.md)

---

### 7.3 — Token & Value Semantics

- **Codice Microstep:** 7.3
- **Titolo:** Token & Value Semantics
- **Blocco:** 7.3 — Token & Value Semantics
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Definizione semantica vincolante del token e del valore: unità tecnica, non economica; significato esplicito e statico; neutralità rispetto a merito, status, priorità.
- **Documento di riferimento:** [7.3-token-value-semantics.md](./7.3-token-value-semantics.md)

---

### 7.4.1 — Pagination & Cursor Policy

- **Codice Microstep:** 7.4.1
- **Titolo:** Pagination & Cursor Policy
- **Blocco:** 7.4 — UX Contract (API-first)
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Paginazione cursor-based obbligatoria per tutte le collezioni UX-facing; ordine dichiarato e stabile; cursor opaco e non interpretabile.
- **Documento di riferimento:** [7.4.1-pagination-cursor-policy.md](./7.4.1-pagination-cursor-policy.md)

---

### 7.4.2 — Sorting & Filtering (UX Contract)

- **Codice Microstep:** 7.4.2
- **Titolo:** Sorting & Filtering (Semantically-Safe)
- **Blocco:** 7.4 — UX Contract (API-first)
- **Stato:** CONGELATO — NON ESTENDIBILE
- **Ruolo architetturale:** Ordinamento e filtri solo tecnici e dichiarativi; nessuna semantica implicita, valutativa o comportamentale; guardrail percettivo vincolante.
- **Documento di riferimento:** [7.4.2-sorting-filtering-semantically-safe.md](./7.4.2-sorting-filtering-semantically-safe.md) | [7.4.2-freeze-sorting-filtering.md](./7.4.2-freeze-sorting-filtering.md)

---

## 2. Clausola di chiusura del documento

L’elenco sopra rappresenta **l’insieme completo e definitivo** dei microstep della Fase 7 formalmente congelati alla data di redazione del presente documento.

- L’elenco è **NON ESTENDIBILE** — **MUST NOT** essere modificato per aggiungere o rimuovere microstep senza **nuova fase** o **revisione architetturale formale**.
- **Ogni** modifica all’elenco o allo stato di congelamento dei microstep ivi indicati **richiede**: **nuova fase** oppure **revisione architetturale formale**.
- **MUST NOT** essere considerato congelato alcun microstep 7.x non incluso in questo elenco, salvo successiva revisione formale che lo inserisca.
- Il presente documento **MUST** essere citabile nella Spec [7.7 — Phase Closure](./7.7-phase-closure.md) come **riferimento architetturale permanente** per i microstep congelati della Fase 7.
- **MUST NOT** essere usato per estendere, reinterpretare o aggirare i vincoli delle spec dei microstep elencati.

**VINCOLANTE.** **CONGELATO.** **NON ESTENDIBILE.**

---

**Fine elenco — Microstep Congelati Fase 7.**
