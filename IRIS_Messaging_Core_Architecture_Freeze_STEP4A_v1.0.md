---
title: "IRIS — Messaging Core Architecture Freeze STEP 4A v1.0"
author: "Principal Engineer + System Architect + Privacy Architect"
version: "1.0"
date: "2026-01-24"
status: "FROZEN — Pre-Implementation"
dependencies: "IRIS_Governance_Frozen_v1.0.md, IRIS_Identity_Hardening_v1.1.md, IRIS_Implementation_FASE2_Identity_v1.0.md"
tags: ["FASE2", "Messaging", "Architecture", "Freeze", "STEP4A", "Vincolante"]
---

# IRIS — Messaging Core Architecture Freeze STEP 4A v1.0

> Congelamento architetturale del Messaging Core IRIS prima di qualsiasi implementazione.  
> Questo documento definisce cosa è un messaggio in IRIS, cosa non può essere, e i vincoli architetturali non negoziabili.  
> **Stato: FROZEN** — non modificabile senza nuovo atto di governance.

---

## Scopo

Congelare **l'architettura del Messaging Core IRIS** prima di qualsiasi implementazione.

Questo documento definisce:
- **Cosa è un messaggio in IRIS**
- **Cosa non può essere**
- **Vincoli architetturali non negoziabili** che ogni futura implementazione dovrà rispettare

🚫 **È vietato scrivere codice prima del completamento e approvazione di questo documento.**  
🚫 **Qualsiasi PR che viola questo freeze viene rifiutata, anche se "funziona meglio".**

---

## 1. Principi Fondanti del Messaging IRIS

### 1.1 Messaging come Atto Relazionale, Non Flusso Infinito

**Principio**  
Il messaging in IRIS è un **atto relazionale strutturato**, non un flusso infinito di comunicazione. Ogni messaggio è un'azione finita, contestualizzata, e attribuibile a un alias specifico.

**Razionale etico-tecnico**  
IRIS privilegia **relazioni strutturate su engagement**. Un flusso infinito di messaggi degrada la qualità delle relazioni, favorisce il rumore, e viola il principio "Relazioni > traffico" (Governance v1.0, Principio 3).

**Vincoli STEP B**  
- SB-007: Protocollo di Relazione
- SB-010: Chat infinita non primaria

---

### 1.2 Ogni Messaggio è Contestuale

**Principio**  
Ogni messaggio deve appartenere a un contesto esplicito (thread). Nessun messaggio può esistere senza contesto.

**Razionale etico-tecnico**  
La contestualizzazione preserva la memoria relazionale, facilita la comprensione, e previene la deriva verso comunicazione non strutturata. Violare questo principio significa violare SB-008 (Thread obbligatori).

**Vincoli STEP B**  
- SB-008: Thread obbligatori
- SB-009: Messaggi con stato

---

### 1.3 Ogni Messaggio è Finito

**Principio**  
Ogni messaggio ha un ciclo di vita finito: creazione → consegna → chiusura. Nessun messaggio può essere "eterno" o "infinito".

**Razionale etico-tecnico**  
La finitudine garantisce che le relazioni siano gestibili, archiviate, e chiudibili. Previene l'accumulo infinito di dati e rispetta il diritto all'oblio (SB-004).

**Vincoli STEP B**  
- SB-004: Diritto all'oblio
- SB-007: Protocollo di Relazione

---

### 1.4 Ogni Messaggio è Attribuibile a un Alias (Mai alla Root Identity)

**Principio**  
Ogni messaggio è attribuito a un alias specifico, mai alla root identity. La root identity non è mai esposta nel messaging.

**Razionale etico-tecnico**  
L'esposizione della root identity violerebbe SB-011 (Root identity non eliminabile) e comprometterebbe la privacy. Gli alias sono l'unico livello visibile nel messaging.

**Vincoli STEP B**  
- SB-011: Root identity non eliminabile
- SB-012: Alias come projection

---

### 1.5 Nessuna Interazione "Senza Stato"

**Principio**  
Ogni messaggio deve avere uno stato esplicito e verificabile. Nessuna interazione può essere "senza stato".

**Razionale etico-tecnico**  
Lo stato esplicito garantisce tracciabilità, accountability, e coerenza relazionale. Violare questo principio significa violare SB-009 (Messaggi con stato).

**Vincoli STEP B**  
- SB-009: Messaggi con stato
- SB-007: Protocollo di Relazione

---

### 1.6 Nessuna Comunicazione Fuori da un Thread Esplicito

**Principio**  
Ogni messaggio deve appartenere a un thread esplicito. Nessuna comunicazione può avvenire fuori da un thread.

**Razionale etico-tecnico**  
Il threading obbligatorio garantisce struttura, contesto, e memoria relazionale. Violare questo principio significa violare SB-008 (Thread obbligatori) e SB-014 (Community unita primaria).

**Vincoli STEP B**  
- SB-008: Thread obbligatori
- SB-014: Community unita primaria

---

## 2. Definizione Formale di "Messaggio"

### 2.1 Struttura Minima di un Messaggio IRIS

Un messaggio IRIS **DEVE** contenere:

1. **Sender Alias** (obbligatorio)
   - Identificatore alias del mittente
   - Mai root identity
   - Verificabile e tracciabile

2. **Receiver Alias / Thread** (obbligatorio)
   - Identificatore alias del destinatario (per messaggi 1-to-1)
   - Identificatore thread (per messaggi in thread)
   - Mai root identity

3. **Payload** (obbligatorio)
   - Contenuto del messaggio
   - Formato definito (testo, metadati strutturati)
   - Dimensione massima definita (vedi Sezione 6)

4. **Timestamp** (obbligatorio)
   - Timestamp di creazione (UTC)
   - Timestamp di consegna (se applicabile)
   - Timestamp di lettura (se applicabile)
   - Immutabile dopo creazione

5. **Stato** (obbligatorio)
   - Stato del messaggio (vedi Sezione 2.2)
   - Verificabile e tracciabile
   - Immutabile senza transizione valida

6. **Thread ID** (obbligatorio)
   - Identificatore thread di appartenenza
   - Mai nullo o vuoto
   - Verificabile

---

### 2.2 Stati Obbligatori del Messaggio

Un messaggio IRIS può trovarsi in uno dei seguenti stati:

| Stato | Descrizione | Transizioni Consentite | Note |
|-------|-------------|------------------------|------|
| **DRAFT** | Messaggio in bozza, non ancora inviato | → SENT, → CANCELLED | Solo locale, mai sincronizzato |
| **SENT** | Messaggio inviato, in attesa di consegna | → DELIVERED, → FAILED | Stato persistente |
| **DELIVERED** | Messaggio consegnato al destinatario | → READ, → ARCHIVED | Stato persistente |
| **READ** | Messaggio letto dal destinatario | → ARCHIVED, → EXPIRED | Stato persistente |
| **ARCHIVED** | Messaggio archiviato | → EXPIRED | Stato persistente |
| **EXPIRED** | Messaggio scaduto (TTL raggiunto) | Nessuna | Stato finale |
| **FAILED** | Messaggio non consegnato | → SENT (retry), → CANCELLED | Stato persistente |
| **CANCELLED** | Messaggio cancellato dal mittente | Nessuna | Stato finale |

**Regole di transizione**:
- Transizioni solo tra stati adiacenti (definiti nella tabella)
- Transizioni immutabili (una volta raggiunto uno stato, non si può tornare indietro)
- Transizioni verificabili (ogni transizione deve essere tracciabile)

---

### 2.3 Lifecycle Completo di un Messaggio

**Fase 1: Creazione**
- Messaggio creato in stato DRAFT
- Validazione struttura minima
- Validazione thread esistente
- Validazione alias mittente/destinatario

**Fase 2: Invio**
- Transizione DRAFT → SENT
- Messaggio sincronizzato (con padding/batching Identity Hardening)
- Validazione offline-first (se offline, messaggio in coda locale)

**Fase 3: Consegna**
- Transizione SENT → DELIVERED
- Consegna asincrona (non realtime)
- Validazione destinatario esistente e attivo

**Fase 4: Lettura (opzionale)**
- Transizione DELIVERED → READ
- Timestamp lettura tracciabile
- Nessun read receipt obbligatorio (vedi Sezione 5)

**Fase 5: Chiusura**
- Transizione a ARCHIVED o EXPIRED
- Archiviazione locale e sincronizzazione
- Garbage collection semantica (vedi Sezione 6)

---

### 2.4 Esclusioni Esplicite

Un messaggio IRIS **NON PUÒ** essere:

1. **Anonimo**
   - Ogni messaggio deve avere un sender alias
   - Violazione: SB-012 (Alias come projection)

2. **Senza Thread**
   - Ogni messaggio deve appartenere a un thread
   - Violazione: SB-008 (Thread obbligatori)

3. **Ephemerally Infinite**
   - Nessun messaggio può essere "infinito" o "eterno"
   - Violazione: SB-007 (Protocollo di Relazione)

4. **Senza Stato**
   - Ogni messaggio deve avere uno stato esplicito
   - Violazione: SB-009 (Messaggi con stato)

5. **Chat Scroll Senza Fine**
   - Nessun scroll infinito di messaggi
   - Violazione: SB-010 (Chat infinita non primaria)

---

## 3. Threading Obbligatorio

### 3.1 Definizione di Thread IRIS

Un **Thread IRIS** è un contenitore strutturato di messaggi con:
- Contesto esplicito
- Partecipanti espliciti (alias)
- Stato (open / paused / closed / archived)
- Memoria relazionale persistente

**Ogni messaggio appartiene a un thread.**  
**Nessun messaggio può esistere senza thread.**

---

### 3.2 Proprietà di un Thread

Un thread IRIS **DEVE** avere:

1. **Thread ID** (obbligatorio)
   - Identificatore univoco thread
   - Generato localmente, sincronizzato
   - Immutabile

2. **Contesto** (obbligatorio)
   - Descrizione contesto thread
   - Metadati strutturati
   - Verificabile

3. **Partecipanti Espliciti** (obbligatorio)
   - Lista alias partecipanti
   - Mai root identity
   - Aggiornabile (aggiunta/rimozione partecipanti)

4. **Stato** (obbligatorio)
   - Stato thread (vedi Sezione 3.3)
   - Verificabile e tracciabile
   - Immutabile senza transizione valida

5. **Community ID** (obbligatorio)
   - Identificatore community di appartenenza
   - Verificabile
   - Immutabile

---

### 3.3 Thread State Machine

| Stato | Descrizione | Transizioni Consentite | Note |
|-------|-------------|------------------------|------|
| **OPEN** | Thread attivo, accetta nuovi messaggi | → PAUSED, → CLOSED | Stato iniziale |
| **PAUSED** | Thread temporaneamente sospeso | → OPEN, → CLOSED | Nessun nuovo messaggio |
| **CLOSED** | Thread chiuso, nessun nuovo messaggio | → ARCHIVED | Stato persistente |
| **ARCHIVED** | Thread archiviato | Nessuna | Stato finale |

**Regole di transizione**:
- Transizioni solo tra stati adiacenti (definiti nella tabella)
- Transizioni immutabili (una volta raggiunto uno stato, non si può tornare indietro)
- Transizioni verificabili (ogni transizione deve essere tracciabile)

---

### 3.4 Regole di Apertura e Chiusura Thread

**Apertura Thread**:
- Thread creato in stato OPEN
- Almeno 2 partecipanti (alias)
- Contesto esplicito definito
- Community ID verificabile

**Chiusura Thread**:
- Transizione a CLOSED o ARCHIVED
- Nessun nuovo messaggio accettato
- Messaggi esistenti preservati
- Memoria relazionale consultabile

**Impossibilità di "Chat Infinita Piatta**:
- Nessun thread può essere "infinito" o "eterno"
- Nessun thread può avere scroll infinito
- Thread devono essere chiusi o archiviati dopo periodo definito (vedi Sezione 6)

---

## 4. Relazione con Identity (VINCOLO CRITICO)

### 4.1 Mappatura Messaging Core → Identity Constraints

| Messaging Feature | Identity Constraint | Failure Mode se Violato |
|------------------|-------------------|------------------------|
| **Sender Alias** | SB-012: Alias come projection | Root identity esposta, correlazione possibile |
| **Receiver Alias** | SB-012: Alias come projection | Root identity esposta, correlazione possibile |
| **Thread Participants** | SB-012: Alias come projection | Root identity esposta, correlazione possibile |
| **Message Timing** | Identity Hardening: Padding & Batching | Timing correlation possibile, root identity inferibile |
| **Delivery Pattern** | Identity Hardening: Behavioral Obfuscation | Pattern comportamentali correlabili, alias correlabili |
| **Metadata Sync** | Identity Hardening: Log Sanitization | Metadata leak, root identity inferibile |
| **Referral in Messaging** | Identity Hardening: Blind Referral | Social graph leakage, correlazione possibile |
| **Discovery in Messaging** | SB-026: Discovery attiva | Pattern leakage, re-identificazione possibile |

---

### 4.2 Root Identity → Mai Esposta

**Vincolo**  
La root identity **NON PUÒ** essere esposta nel messaging core, nemmeno indirettamente.

**Enforcement**:
- Nessun campo messaggio può contenere root identity
- Nessun metadata può rivelare root identity
- Nessun timing può correlare root identity
- Nessun pattern può inferire root identity

**Violazione**: SB-011 (Root identity non eliminabile) → **RIFIUTO PR AUTOMATICO**

---

### 4.3 Alias → Unico Livello Visibile

**Vincolo**  
Gli alias sono l'unico livello visibile nel messaging core.

**Enforcement**:
- Ogni messaggio è attribuito a un alias
- Ogni thread ha partecipanti alias
- Nessun riferimento a root identity
- Mapping alias → root identity mai esposto

**Violazione**: SB-012 (Alias come projection) → **RIFIUTO PR AUTOMATICO**

---

### 4.4 Nessun Leak Tramite Timing

**Vincolo**  
Il messaging core **NON PUÒ** rivelare correlazioni tramite timing.

**Enforcement**:
- Padding & batching sync events (Identity Hardening v1.1)
- Timing randomizzato per delivery
- Nessun sync immediato "edge-triggered"
- Jitter casuale controllato (50-200ms)

**Violazione**: Identity Hardening v1.1 → **RIFIUTO PR AUTOMATICO**

---

### 4.5 Nessun Leak Tramite Metadata

**Vincolo**  
Il messaging core **NON PUÒ** rivelare correlazioni tramite metadata.

**Enforcement**:
- Log sanitization (Identity Hardening v1.1)
- Metadata cifrati o hash temporanei
- Nessun ID persistente in log
- Audit log encryption

**Violazione**: Identity Hardening v1.1 → **RIFIUTO PR AUTOMATICO**

---

### 4.6 Nessun Leak Tramite Delivery Pattern

**Vincolo**  
Il messaging core **NON PUÒ** rivelare correlazioni tramite pattern di delivery.

**Enforcement**:
- Behavioral obfuscation (Identity Hardening v1.1)
- Pattern temporali randomizzati
- Pattern di ordering randomizzati
- Nessuna correlazione cross-alias

**Violazione**: Identity Hardening v1.1 → **RIFIUTO PR AUTOMATICO**

---

### 4.7 Blind Referral Compatibility

**Vincolo**  
Il messaging core **DEVE** essere compatibile con blind referral (Identity Hardening v1.1).

**Enforcement**:
- Referral token ciechi
- Nessun grafo sociale esplicito
- Validazione senza esposizione identità
- Nessuna correlazione referral → alias

**Violazione**: Identity Hardening v1.1 → **RIFIUTO PR AUTOMATICO**

---

### 4.8 Discovery Opt-in Respected

**Vincolo**  
Il messaging core **DEVE** rispettare discovery opt-in (SB-026).

**Enforcement**:
- Discovery disattivo di default
- Opt-in esplicito richiesto
- Suggerimenti randomizzati
- Nessuna persistenza suggerimenti

**Violazione**: SB-026 (Discovery attiva) → **RIFIUTO PR AUTOMATICO**

---

## 5. Anti-Pattern Esplicitamente Vietati

### 5.1 🚫 Forbidden by Design

| Anti-Pattern | Motivazione | Vincolo STEP B Violato |
|-------------|-------------|------------------------|
| **DM senza thread** | Violazione threading obbligatorio | SB-008 (Thread obbligatori) |
| **Auto-suggest aggressivi** | Violazione agency utente | SB-001 (No dark pattern) |
| **Ranking messaggi invisibile** | Violazione trasparenza | SB-003 (No gamification tossica) |
| **"Last seen" implicito** | Violazione privacy by default | SB-004 (Diritto all'oblio) |
| **Read receipt non controllabili** | Violazione agency utente | SB-001 (No dark pattern) |
| **Typing indicator correlabile** | Violazione privacy, timing correlation | Identity Hardening v1.1 |
| **Chat scroll infinito** | Violazione finitudine | SB-010 (Chat infinita non primaria) |
| **Messaggi anonimi** | Violazione accountability | SB-012 (Alias come projection) |
| **Messaggi senza stato** | Violazione tracciabilità | SB-009 (Messaggi con stato) |
| **Realtime delivery obbligatorio** | Violazione offline-first | SB-024 (Accesso multi-dispositivo) |
| **Social graph esplicito** | Violazione privacy | Identity Hardening v1.1 (Blind Referral) |
| **Pattern leakage discovery** | Violazione privacy | SB-026 (Discovery attiva) |

---

### 5.2 Dettaglio Anti-Pattern Critici

#### 5.2.1 DM Senza Thread

**Vietato**: Messaggi diretti (DM) senza thread esplicito.

**Motivazione**: Violazione SB-008 (Thread obbligatori). Ogni messaggio deve appartenere a un thread.

**Enforcement**: Validazione obbligatoria thread ID per ogni messaggio.

---

#### 5.2.2 Auto-Suggest Aggressivi

**Vietato**: Suggerimenti automatici aggressivi che manipolano il comportamento utente.

**Motivazione**: Violazione SB-001 (No dark pattern). L'utente deve avere agency sulle proprie interazioni.

**Enforcement**: Suggerimenti solo opt-in, non prescrittivi, revocabili.

---

#### 5.2.3 Ranking Messaggi Invisibile

**Vietato**: Ranking o ordinamento messaggi non trasparente all'utente.

**Motivazione**: Violazione SB-003 (No gamification tossica) e trasparenza operativa.

**Enforcement**: Ogni ordinamento deve essere esplicito e controllabile dall'utente.

---

#### 5.2.4 "Last Seen" Implicito

**Vietato**: Indicatore "last seen" attivo di default o non controllabile.

**Motivazione**: Violazione SB-004 (Diritto all'oblio) e privacy by default.

**Enforcement**: "Last seen" solo opt-in esplicito, revocabile, non persistente.

---

#### 5.2.5 Read Receipt Non Controllabili

**Vietato**: Read receipt obbligatori o non controllabili dall'utente.

**Motivazione**: Violazione SB-001 (No dark pattern) e agency utente.

**Enforcement**: Read receipt solo opt-in esplicito, revocabile, controllabile per thread.

---

#### 5.2.6 Typing Indicator Correlabile

**Vietato**: Typing indicator che rivela pattern temporali correlabili.

**Motivazione**: Violazione Identity Hardening v1.1 (Timing correlation).

**Enforcement**: Typing indicator con padding/batching, non correlabile cross-alias.

---

## 6. Stati, Limiti e Finitudine

### 6.1 Limiti Strutturali

| Limite | Valore | Razionale |
|--------|--------|-----------|
| **Messaggi per thread** | Max 10,000 | Prevenire accumulo infinito, garantire gestibilità |
| **Durata thread** | Max 365 giorni | Prevenire thread "eterni", garantire finitudine |
| **Dimensione payload messaggio** | Max 10 MB | Prevenire abusi, garantire performance |
| **Thread aperti per alias** | Max 100 | Prevenire sovraccarico, garantire gestibilità |
| **Messaggi in coda offline** | Max 1,000 | Prevenire accumulo, garantire sincronizzazione |

**Razionale generale**: I limiti strutturali garantiscono che il sistema sia gestibile, finito, e rispetti il diritto all'oblio (SB-004).

---

### 6.2 Archiviazione vs Cancellazione

**Archiviazione**:
- Thread chiusi archiviati dopo 30 giorni di inattività
- Messaggi archiviati preservati per consultazione
- Archiviazione locale e sincronizzata
- Consultazione possibile ma non modifica

**Cancellazione**:
- Messaggi cancellati dal mittente (stato CANCELLED)
- Cancellazione effettiva dati personali (SB-004)
- Separazione continuità relazionale / dati personali
- Garbage collection semantica

**Garbage Collection Semantica**:
- Messaggi EXPIRED rimossi dopo 90 giorni
- Thread ARCHIVED rimossi dopo 1 anno
- Rimozione automatica e verificabile
- Log audit per rimozioni

---

### 6.3 Impossibilità di Scroll Infinito

**Vincolo**  
Nessun thread può avere scroll infinito di messaggi.

**Enforcement**:
- Paginazione obbligatoria (max 100 messaggi per pagina)
- Navigazione esplicita (indietro/avanti)
- Nessun auto-load infinito
- Limite messaggi per thread (10,000)

**Violazione**: SB-010 (Chat infinita non primaria) → **RIFIUTO PR AUTOMATICO**

---

## 7. Delivery & Offline-First (Senza Leaking)

### 7.1 Modello di Delivery Asincrono

**Principio**  
Il delivery è asincrono, non realtime. Nessun delivery realtime obbligatorio.

**Enforcement**:
- Delivery asincrono con retry policy
- Nessun timeout realtime
- Priorità on-device, sync opzionale
- Fallback edge se latenza >100ms (Identity Hardening v1.1)

**Vincoli STEP B**:
- SB-024: Accesso multi-dispositivo
- Identity Hardening v1.1: Padding & Batching

---

### 7.2 Supporto Offline-First

**Principio**  
Il messaging core funziona completamente offline. La sincronizzazione è opzionale e asincrona.

**Enforcement**:
- Messaggi creati e salvati localmente
- Sincronizzazione asincrona quando connessione disponibile
- Nessun blocco operazioni locali
- Coda offline con limite (1,000 messaggi)

**Vincoli STEP B**:
- SB-024: Accesso multi-dispositivo
- SB-005: Proprietà del dato

---

### 7.3 Retry Policy

**Principio**  
Retry policy per messaggi non consegnati (stato FAILED).

**Enforcement**:
- Retry esponenziale backoff (1s, 2s, 4s, 8s, 16s, max 60s)
- Max 5 tentativi
- Dopo 5 tentativi, messaggio in stato FAILED
- Notifica mittente (opzionale, opt-in)

---

### 7.4 Padding/Batching Coerente con Identity Hardening

**Principio**  
Il messaging core **DEVE** rispettare padding/batching di Identity Hardening v1.1.

**Enforcement**:
- Batching sync events (min 3 eventi per batch)
- Jitter casuale controllato (50-200ms)
- Nessun sync immediato "edge-triggered"
- Overhead < 15%

**Violazione**: Identity Hardening v1.1 → **RIFIUTO PR AUTOMATICO**

---

### 7.5 🚫 Vietato Introdurre

| Feature | Motivazione | Vincolo Violato |
|---------|-------------|-----------------|
| **Realtime typing leaks** | Timing correlation | Identity Hardening v1.1 |
| **Delivery che espone pattern comportamentali** | Behavioral correlation | Identity Hardening v1.1 |
| **Sync immediato obbligatorio** | Timing correlation | Identity Hardening v1.1 |
| **Metadata esposti in plaintext** | Metadata leak | Identity Hardening v1.1 |

---

## 8. Vincoli per UI e AI (FUTURI)

### 8.1 UI Non Può

| Vincolo UI | Motivazione | Vincolo STEP B |
|-----------|-------------|----------------|
| **Aggirare thread** | Violazione threading obbligatorio | SB-008 (Thread obbligatori) |
| **Creare scorciatoie DM** | Violazione threading obbligatorio | SB-008 (Thread obbligatori) |
| **Mostrare scroll infinito** | Violazione finitudine | SB-010 (Chat infinita non primaria) |
| **Nascondere stato messaggi** | Violazione trasparenza | SB-009 (Messaggi con stato) |
| **Auto-suggest aggressivi** | Violazione agency utente | SB-001 (No dark pattern) |
| **Ranking invisibile** | Violazione trasparenza | SB-003 (No gamification tossica) |

---

### 8.2 AI Non Può

| Vincolo AI | Motivazione | Vincolo STEP B |
|-----------|-------------|----------------|
| **Riassumere senza consenso** | Violazione AI opt-in | SB-017 (AI opt-in) |
| **Inferire stati emotivi** | Violazione AI non mediatore | SB-019 (AI non mediatore) |
| **Suggerire ranking nascosti** | Violazione trasparenza | SB-003 (No gamification tossica) |
| **Mediare conflitti prescrittivamente** | Violazione AI non mediatore | SB-019 (AI non mediatore) |
| **Sostituire interazioni umane** | Violazione anti-isolamento | Governance v1.0, Principio 9 |
| **Attivarsi senza opt-in** | Violazione AI opt-in | SB-017 (AI opt-in) |

---

### 8.3 Future Binding Constraints

**Principio**  
Questi vincoli sono **binding** per future implementazioni di UI e AI, anche se non ancora implementate.

**Enforcement**:
- Code review obbligatoria per conformità
- Test obbligatori per verificare vincoli
- Rifiuto PR se vincoli violati

---

## 9. Checklist di Conformità (PRE-IMPLEMENTATION)

### 9.1 Checklist Pre-Coding

Ogni team **DEVE** verificare prima di iniziare coding:

- [ ] Documento di freeze architetturale letto e compreso
- [ ] Principi fondanti del messaging IRIS compresi
- [ ] Definizione formale di messaggio compresa
- [ ] Threading obbligatorio compreso
- [ ] Relazione con Identity compresa
- [ ] Anti-pattern vietati compresi
- [ ] Limiti strutturali compresi
- [ ] Delivery & offline-first compresi
- [ ] Vincoli UI/AI futuri compresi

**Firma obbligatoria**: Principal Engineer + Lead Engineer

---

### 9.2 Checklist Pre-PR

Ogni PR **DEVE** verificare:

- [ ] Nessun messaggio senza thread
- [ ] Nessun messaggio senza stato
- [ ] Nessun messaggio senza alias (mai root identity)
- [ ] Nessun thread infinito o scroll infinito
- [ ] Nessun leak timing (padding/batching rispettato)
- [ ] Nessun leak metadata (log sanitization rispettato)
- [ ] Nessun leak pattern (behavioral obfuscation rispettato)
- [ ] Nessun anti-pattern vietato implementato
- [ ] Limiti strutturali rispettati
- [ ] Offline-first rispettato
- [ ] Delivery asincrono (non realtime obbligatorio)

**Firma obbligatoria**: Code Reviewer + Principal Engineer

---

### 9.3 Checklist Pre-Test

Ogni test **DEVE** verificare:

- [ ] Test thread obbligatori
- [ ] Test messaggi con stato
- [ ] Test alias (mai root identity)
- [ ] Test finitudine (nessun scroll infinito)
- [ ] Test timing correlation (padding/batching)
- [ ] Test metadata leak (log sanitization)
- [ ] Test pattern leak (behavioral obfuscation)
- [ ] Test anti-pattern vietati
- [ ] Test limiti strutturali
- [ ] Test offline-first

**Firma obbligatoria**: QA Lead + Principal Engineer

---

## 10. Dichiarazione di Freeze

### 10.1 Testo Normativo Vincolante

> **Questo documento congela l'architettura del Messaging Core IRIS.**
>
> **Ogni deviazione richiede**:
> - Audit ostile dedicato
> - Aggiornamento governance
> - Approvazione esplicita di Principal Engineer + Privacy Architect
>
> **Nessuna PR può modificare questo freeze direttamente.**
>
> **Qualsiasi violazione comporta rifiuto automatico della PR, anche se "funziona meglio".**

---

### 10.2 Versione Documento

- **Versione**: v1.0
- **Data**: 2026-01-24
- **Stato**: **FROZEN**
- **Validità**: Fino a revisione formale prima di STEP 5

---

### 10.3 Scope

Questo documento copre:
- **FASE 1**: Principi fondanti, threading obbligatorio
- **FASE 2**: Relazione con Identity, delivery offline-first
- **STEP 3.5**: Identity Hardening compatibility
- **STEP 4A**: Messaging Core Architecture Freeze

---

### 10.4 Riferimenti Normativi

Questo documento è vincolato da:
- `IRIS_Governance_Frozen_v1.0.md` — Governance congelata
- `IRIS_Identity_Hardening_v1.1.md` — Identity Hardening Sprint
- `IRIS_Implementation_FASE2_Identity_v1.0.md` — Identity Implementation
- STEP B vincoli (SB-007, SB-008, SB-009, SB-010, SB-011, SB-012, SB-014, SB-024, SB-026)

---

### 10.5 Tracciabilità

Ogni modifica futura a questo documento deve essere:
- Versionata (v1.1, v1.2, etc.)
- Documentata con motivazione esplicita
- Approvata formalmente da Principal Engineer + Privacy Architect
- Tracciata in changelog separato

---

## 11. Approvazioni Obbligatorie

### 11.1 Firma Team

**Principal Engineer**: _________________  
**System Architect**: _________________  
**Privacy Architect**: _________________  
**Lead Engineer**: _________________  
**Product Owner**: _________________

---

### 11.2 Data Approvazione

**Data**: 2026-01-24  
**Versione**: v1.0  
**Stato**: **FROZEN**

---

**Documento vincolante per implementazione Messaging Core IRIS.**  
**Ogni violazione comporta rifiuto PR e escalation automatica.**  
**Nessuna implementazione può procedere senza conformità a questo documento.**
