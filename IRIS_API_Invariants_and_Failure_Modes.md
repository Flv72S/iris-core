---
title: "IRIS — API Invariants and Failure Modes STEP 5.3"
author: "Principal System Architect & Protocol Designer"
version: "1.0"
date: "2026-01-26"
status: "FROZEN — Pre-Implementation"
dependencies: "IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md"
tags: ["FASE2", "Messaging", "API", "Invariants", "Failure", "STEP5.3", "Vincolante"]
---

# IRIS — API Invariants and Failure Modes STEP 5.3

> Invarianti sistemiche e failure mode ammessi per i contratti API del Messaging Core IRIS.  
> **Stato: FROZEN** — non modificabile senza nuovo atto di governance.

---

## 🎯 SCOPO

Questo documento definisce:

1. **Invarianti sistemiche** — Vincoli non negoziabili che devono essere sempre rispettati
2. **Anti-pattern vietati** — Comportamenti esplicitamente proibiti
3. **Motivi di sicurezza / UX / semantica** — Razionale per ogni invariante
4. **Riferimenti agli scenari UX ostili** — Mapping a scenari documentati in STEP 4F

---

## 🔒 INVARIANTI SISTEMICI

### Invariante SYS-01: Append-Only Messaging

**Dichiarazione**:  
Un messaggio può essere **solo aggiunto**, mai modificato, sovrascritto o eliminato (tranne stato CANCELLED).

**Enforcement**:
- ✅ Nessun endpoint `PUT /api/messaging/messages/{messageId}`
- ✅ Nessun endpoint `PATCH /api/messaging/messages/{messageId}`
- ✅ Nessun endpoint `DELETE /api/messaging/messages/{messageId}` (solo CANCELLED state)
- ✅ Campo `payload` immutabile dopo creazione
- ✅ Campo `senderAlias` immutabile dopo creazione
- ✅ Campo `threadId` immutabile dopo creazione
- ✅ Campo `createdAt` immutabile dopo creazione

**Motivazione**:
- **Sicurezza**: Previene manipolazione retroattiva dei messaggi
- **UX**: Garantisce integrità conversazionale
- **Semantica**: Rispetta principio "append-only" (STEP 4A §1.1)

**Riferimenti**:
- STEP 4A §1.1 (Messaging come Atto Relazionale)
- STEP 4A §2.3 (Lifecycle Completo di un Messaggio)
- STEP 4F UX-16 (Gaming stato messaggi/thread per controllo)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-02: Thread-First Architecture

**Dichiarazione**:  
Ogni messaggio **DEVE** appartenere a un thread esplicito. Nessun messaggio può esistere senza thread.

**Enforcement**:
- ✅ Campo `threadId` obbligatorio in ogni request/response
- ✅ Validazione esistenza thread prima di creazione messaggio
- ✅ Nessun endpoint `POST /api/messaging/messages` (solo thread-scoped)
- ✅ Endpoint sempre: `POST /api/messaging/threads/{threadId}/messages`

**Motivazione**:
- **Sicurezza**: Previene messaggi orfani e correlazione non autorizzata
- **UX**: Garantisce contesto esplicito per ogni messaggio
- **Semantica**: Rispetta threading obbligatorio (STEP 4A §1.6)

**Riferimenti**:
- STEP 4A §1.6 (Nessuna Comunicazione Fuori da un Thread Esplicito)
- STEP 4A §3 (Threading Obbligatorio)
- STEP 4F UX-01 (Bypass finitudine percepita)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-03: Alias-Only Identity

**Dichiarazione**:  
Ogni messaggio è attribuito a un **alias specifico**, mai alla root identity. La root identity non è mai esposta nel messaging.

**Enforcement**:
- ✅ Campo `senderAlias` obbligatorio, mai root identity
- ✅ Campo `receiverAlias` (se presente) obbligatorio, mai root identity
- ✅ Lista partecipanti thread contiene solo alias, mai root identity
- ✅ Validazione esistenza alias prima di creazione messaggio
- ✅ Nessun campo `userId` o `rootIdentity` esposto

**Motivazione**:
- **Sicurezza**: Previene correlazione cross-alias e re-identificazione
- **Privacy**: Rispetta principio alias-only (STEP 4A §1.4)
- **Semantica**: Garantisce privacy by design

**Riferimenti**:
- STEP 4A §1.4 (Ogni Messaggio è Attribuibile a un Alias)
- STEP 4A §4.2 (Root Identity → Mai Esposta)
- STEP 4F UX-02 (Ricostruzione grafo sociale)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-04: Stato Esplicito Obbligatorio

**Dichiarazione**:  
Ogni messaggio e thread **DEVE** avere uno stato esplicito e verificabile. Nessuna interazione può essere "senza stato".

**Enforcement**:
- ✅ Campo `state` obbligatorio in ogni messaggio
- ✅ Campo `state` obbligatorio in ogni thread
- ✅ Enum chiuso, finito (nessun altro stato possibile)
- ✅ Validazione stato valido prima di creazione/aggiornamento
- ✅ Nessun campo `status` ambiguo o derivato

**Motivazione**:
- **Sicurezza**: Garantisce tracciabilità e accountability
- **UX**: Previene ambiguità e inferenza sociale
- **Semantica**: Rispetta principio stato esplicito (STEP 4A §1.5)

**Riferimenti**:
- STEP 4A §1.5 (Nessuna Interazione "Senza Stato")
- STEP 4A §2.2 (Stati Obbligatori del Messaggio)
- STEP 4F UX-05 (Gaming stato READ per pressione sociale)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-05: Timestamp Arrotondato (Privacy-First)

**Dichiarazione**:  
Ogni timestamp **DEVE** essere arrotondato a bucket di 5 secondi per prevenire correlazione temporale precisa.

**Enforcement**:
- ✅ Timestamp sempre arrotondato: `Math.floor(timestamp / 5000) * 5000`
- ✅ Validazione timestamp arrotondato in ogni response
- ✅ Nessun timestamp ad alta risoluzione esposto
- ✅ Timestamp server-side, non client-side

**Motivazione**:
- **Sicurezza**: Previene timing correlation e re-identificazione
- **Privacy**: Rispetta principio privacy-first (STEP 4D.5 §4)
- **Semantica**: Garantisce privacy by design

**Riferimenti**:
- STEP 4D.5 §4 (Arrotondamento Timestamp)
- Identity Hardening v1.1 (Timing correlation)
- STEP 4F UX-06 (Correlazione timestamp manuale)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-06: Partecipanti Randomizzati (Non Persistente)

**Dichiarazione**:  
L'ordine dei partecipanti thread **DEVE** essere randomizzato per ogni request, non persistente.

**Enforcement**:
- ✅ Partecipanti sempre randomizzati in ogni response
- ✅ Ordine randomizzato basato su seed determinato (requestId + timestamp bucket)
- ✅ Nessun ordinamento persistente o derivato
- ✅ Validazione randomizzazione in ogni response

**Motivazione**:
- **Sicurezza**: Previene correlazione cross-thread e ricostruzione grafo sociale
- **Privacy**: Rispetta principio privacy-first (STEP 4D.5 §1)
- **Semantica**: Garantisce privacy by design

**Riferimenti**:
- STEP 4D.5 §1 (Randomizzazione Partecipanti)
- Identity Hardening v1.1 (Behavioral obfuscation)
- STEP 4F UX-02 (Ricostruzione grafo sociale)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-07: Offline-First Architecture

**Dichiarazione**:  
Il sistema **DEVE** funzionare completamente offline. La sincronizzazione è opzionale e asincrona.

**Enforcement**:
- ✅ Messaggi salvati localmente (stato DRAFT) quando offline
- ✅ Coda offline con limite (max 1000 messaggi)
- ✅ Sincronizzazione asincrona quando connessione disponibile
- ✅ Nessun blocco operazioni locali
- ✅ Nessun errore se offline (solo se coda piena)

**Motivazione**:
- **UX**: Garantisce continuità operativa anche offline
- **Semantica**: Rispetta principio offline-first (STEP 4A §7.2)
- **Privacy**: Previene leak timing tramite sincronizzazione

**Riferimenti**:
- STEP 4A §7.2 (Supporto Offline-First)
- STEP 4A §SB-024 (Accesso multi-dispositivo)
- STEP 4F UX-04 (Forzatura realtime percepito)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-08: Nessun Realtime Implicito

**Dichiarazione**:  
Il sistema è **asincrono, non realtime**. Nessun realtime obbligatorio o implicito.

**Enforcement**:
- ✅ Nessun endpoint WebSocket o Server-Sent Events
- ✅ Nessun polling automatico invisibile
- ✅ Nessun campo `isRealtime` o `isLive`
- ✅ Nessun suggerimento di urgenza o attesa
- ✅ Sincronizzazione solo esplicita (endpoint dedicato)

**Motivazione**:
- **UX**: Previene dipendenza comportamentale e pattern compulsivi
- **Semantica**: Rispetta principio asincrono (STEP 4A §7.1)
- **Privacy**: Previene leak timing tramite realtime

**Riferimenti**:
- STEP 4A §7.1 (Modello di Delivery Asincrono)
- STEP 4A §4 (Assenza di realtime)
- STEP 4F UX-04 (Forzatura realtime percepito)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-09: Errori Espliciti e Dichiarativi

**Dichiarazione**:  
Ogni errore **DEVE** essere esplicito, dichiarativo, non emozionale, non prescrittivo.

**Enforcement**:
- ✅ Codice errore standardizzato (enum)
- ✅ Messaggio dichiarativo (non prescrittivo)
- ✅ Nessun suggerimento di azione
- ✅ Nessun copy emozionale
- ✅ HTTP status code corretto

**Motivazione**:
- **UX**: Previene manipolazione emotiva e dark patterns
- **Semantica**: Rispetta principio trasparenza (STEP 4E §6)
- **Sicurezza**: Garantisce accountability e auditabilità

**Riferimenti**:
- STEP 4E §6 (Gestione errori)
- STEP 4G §2.3 (Comunicazione Rate Limit)
- STEP 4F UX-08 (Abuse errori)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Invariante SYS-10: Finitudine Esplicita

**Dichiarazione**:  
Ogni lista o collezione **DEVE** essere finita, con limiti espliciti e visibili.

**Enforcement**:
- ✅ Paginazione obbligatoria (max 100 messaggi per pagina)
- ✅ Limite messaggi per thread (max 10,000)
- ✅ Limite thread aperti per alias (max 100)
- ✅ Limite messaggi in coda offline (max 1,000)
- ✅ Indicatore esplicito "fine lista" quando applicabile

**Motivazione**:
- **UX**: Previene scroll infinito e pattern dipendenza
- **Semantica**: Rispetta principio finitudine (STEP 4A §6.1)
- **Sicurezza**: Previene abusi e accumulo infinito

**Riferimenti**:
- STEP 4A §6.1 (Limiti Strutturali)
- STEP 4A §6.3 (Impossibilità di Scroll Infinito)
- STEP 4F UX-01 (Bypass finitudine percepita)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

## 🚫 ANTI-PATTERN VIETATI

### Anti-Pattern AP-01: Modifica Retroattiva Messaggi

**Descrizione**:  
Modificare, sovrascrivere o eliminare un messaggio dopo la creazione.

**Motivazione**:
- Violazione invariante SYS-01 (Append-Only)
- Violazione integrità conversazionale
- Violazione accountability

**Enforcement**:
- ✅ Nessun endpoint `PUT /api/messaging/messages/{messageId}`
- ✅ Nessun endpoint `PATCH /api/messaging/messages/{messageId}`
- ✅ Nessun endpoint `DELETE /api/messaging/messages/{messageId}` (solo CANCELLED state)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-02: Messaggi Senza Thread

**Descrizione**:  
Creare messaggi senza thread esplicito o fuori da un thread.

**Motivazione**:
- Violazione invariante SYS-02 (Thread-First)
- Violazione threading obbligatorio
- Violazione contesto esplicito

**Enforcement**:
- ✅ Campo `threadId` obbligatorio in ogni request
- ✅ Validazione esistenza thread prima di creazione messaggio
- ✅ Nessun endpoint `POST /api/messaging/messages` (solo thread-scoped)

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-03: Esposizione Root Identity

**Descrizione**:  
Esporre root identity nel messaging, direttamente o indirettamente.

**Motivazione**:
- Violazione invariante SYS-03 (Alias-Only)
- Violazione privacy by design
- Violazione correlazione cross-alias

**Enforcement**:
- ✅ Campo `senderAlias` obbligatorio, mai root identity
- ✅ Lista partecipanti thread contiene solo alias
- ✅ Nessun campo `userId` o `rootIdentity` esposto

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-04: Stati Inferiti o Derivati

**Descrizione**:  
Inferire o derivare stati da dati non espliciti (es. online/offline, typing, reading).

**Motivazione**:
- Violazione invariante SYS-04 (Stato Esplicito)
- Violazione privacy (inferenza temporale/sociale)
- Violazione trasparenza

**Enforcement**:
- ✅ Enum stato chiuso, finito (solo stati ammessi)
- ✅ Nessun campo `isOnline`, `isTyping`, `isReading`
- ✅ Nessun campo `lastSeenAt` o `lastActivityAt`

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-05: Timestamp ad Alta Risoluzione

**Descrizione**:  
Esporre timestamp ad alta risoluzione (millisecondi precisi) senza arrotondamento.

**Motivazione**:
- Violazione invariante SYS-05 (Timestamp Arrotondato)
- Violazione privacy (timing correlation)
- Violazione re-identificazione

**Enforcement**:
- ✅ Timestamp sempre arrotondato: `Math.floor(timestamp / 5000) * 5000`
- ✅ Validazione timestamp arrotondato in ogni response
- ✅ Nessun timestamp ad alta risoluzione esposto

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-06: Partecipanti Ordinati Persistentemente

**Descrizione**:  
Ordinare partecipanti thread in modo persistente o derivato (es. alfabetico, per importanza).

**Motivazione**:
- Violazione invariante SYS-06 (Partecipanti Randomizzati)
- Violazione privacy (correlazione cross-thread)
- Violazione ricostruzione grafo sociale

**Enforcement**:
- ✅ Partecipanti sempre randomizzati in ogni response
- ✅ Ordine randomizzato basato su seed determinato
- ✅ Nessun ordinamento persistente o derivato

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-07: Realtime Obbligatorio o Implicito

**Descrizione**:  
Implementare realtime obbligatorio o implicito (WebSocket, Server-Sent Events, polling automatico).

**Motivazione**:
- Violazione invariante SYS-08 (Nessun Realtime Implicito)
- Violazione offline-first
- Violazione pattern dipendenza comportamentale

**Enforcement**:
- ✅ Nessun endpoint WebSocket o Server-Sent Events
- ✅ Nessun polling automatico invisibile
- ✅ Nessun campo `isRealtime` o `isLive`

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-08: Errori Emozionali o Prescrittivi

**Descrizione**:  
Mostrare errori con copy emozionale o suggerimenti prescrittivi.

**Motivazione**:
- Violazione invariante SYS-09 (Errori Espliciti)
- Violazione dark patterns
- Violazione manipolazione emotiva

**Enforcement**:
- ✅ Messaggio dichiarativo (non prescrittivo)
- ✅ Nessun suggerimento di azione
- ✅ Nessun copy emozionale

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-09: Liste Infinite o Scroll Infinito

**Descrizione**:  
Implementare liste infinite o scroll infinito senza limiti espliciti.

**Motivazione**:
- Violazione invariante SYS-10 (Finitudine Esplicita)
- Violazione pattern dipendenza
- Violazione accumulo infinito

**Enforcement**:
- ✅ Paginazione obbligatoria (max 100 messaggi per pagina)
- ✅ Limite messaggi per thread (max 10,000)
- ✅ Indicatore esplicito "fine lista" quando applicabile

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

### Anti-Pattern AP-10: Ottimizzazione Invisibile

**Descrizione**:  
Implementare ottimizzazioni invisibili (batching, caching, prefetch, debouncing) senza documentazione.

**Motivazione**:
- Violazione trasparenza
- Violazione accountability
- Violazione auditabilità

**Enforcement**:
- ✅ Ogni ottimizzazione documentata e tracciabile
- ✅ Nessun batching invisibile
- ✅ Nessun caching invisibile

**Violazione**: **RIFIUTO PR AUTOMATICO**

---

## 📊 MAPPING: Invariante → Scenari UX Ostili

| Invariante | Scenari UX Ostili Mitigati | Rischio Originale |
|------------|----------------------------|-------------------|
| **SYS-01** (Append-Only) | UX-16 (Gaming stato messaggi/thread) | MEDIO |
| **SYS-02** (Thread-First) | UX-01 (Bypass finitudine percepita) | ALTO |
| **SYS-03** (Alias-Only) | UX-02 (Ricostruzione grafo sociale) | CRITICO |
| **SYS-04** (Stato Esplicito) | UX-05 (Gaming stato READ) | MEDIO |
| **SYS-05** (Timestamp Arrotondato) | UX-06 (Correlazione timestamp) | MEDIO |
| **SYS-06** (Partecipanti Randomizzati) | UX-02 (Ricostruzione grafo sociale) | CRITICO |
| **SYS-07** (Offline-First) | UX-04 (Forzatura realtime percepito) | ALTO |
| **SYS-08** (Nessun Realtime) | UX-04 (Forzatura realtime percepito) | ALTO |
| **SYS-09** (Errori Espliciti) | UX-08 (Abuse errori) | BASSO |
| **SYS-10** (Finitudine Esplicita) | UX-01 (Bypass finitudine percepita) | ALTO |

---

## ✍️ FIRME (SIMBOLICHE)

**Principal System Architect**: _________________  
**Protocol Designer**: _________________  
**Privacy Architect**: _________________  
**Security Architect**: _________________  
**Principal Engineer**: _________________

---

**Documento vincolante per implementazione API Messaging Core IRIS.**  
**Ogni violazione comporta rifiuto PR e escalation automatica.**  
**Nessuna implementazione può procedere senza conformità a questo documento.**
