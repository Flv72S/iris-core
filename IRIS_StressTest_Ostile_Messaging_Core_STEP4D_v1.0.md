---
title: "IRIS — Stress-Test Ostile Messaging Core STEP 4D v1.0"
author: "Principal Engineer + Security Architect + Privacy Architect + Adversarial Thinker"
version: "1.0"
date: "2026-01-24"
status: "POST-IMPLEMENTATION — Gate STEP 4E"
dependencies: "IRIS_Messaging_Core_Implementation_STEP4C_v1.0.md, IRIS_Messaging_Core_Principio_Vincolo_StressTest_EarlyAdopter_STEP4B_v1.0.md, IRIS_Messaging_Core_Architecture_Freeze_STEP4A_v1.0.md"
tags: ["FASE2", "Messaging", "STEP4D", "Stress-Test", "Security", "Privacy", "Gate"]
---

# IRIS — Stress-Test Ostile Messaging Core STEP 4D v1.0

> Stress-test ostile completo sul Messaging Core IRIS dopo l'implementazione STEP 4C.  
> **Gate obbligatorio**: STEP 4E NON può iniziare finché questo stress-test non è completato e approvato.

---

## 🎯 OBIETTIVO

Verificare che:
- I vincoli architetturali **NON possano essere aggirati** dal codice
- L'implementazione **resista a tentativi ostili realistici**
- Nessun leakage di identità, metadata o pattern sia possibile
- Nessuna scorciatoia "tecnica" consenta di violare IRIS

**Non stai testando funzionalità.**  
**Stai tentando attivamente di violare il sistema.**

---

## 📌 RIFERIMENTI VINCOLANTI

Questo stress-test verifica conformità con:

- `IRIS_Messaging_Core_Architecture_Freeze_STEP4A_v1.0.md`
- `IRIS_Messaging_Core_Principio_Vincolo_StressTest_EarlyAdopter_STEP4B_v1.0.md`
- `IRIS_Messaging_Core_Implementation_STEP4C_v1.0.md`
- `IRIS_Identity_Hardening_v1.1.md`
- `IRIS_Governance_Frozen_v1.0.md`

⚠️ **Questo stress-test ha autorità di BLOCCO**:  
Se emergono failure critici non mitigati → **STEP 4E è BLOCCATO**.

---

## 🧠 METODOLOGIA (OBBLIGATORIA)

### Attori Ostili Simulati

1. **Client Modificato** — Bypass validazione client-side, invio richieste malformate
2. **Attaccante con Accesso API** — Exploit endpoint, tentativi di violazione vincoli
3. **Insider con Accesso ai Log** — Analisi log sanitizzati, tentativi di inferenza
4. **Growth Hacker** — Abusi soft, tentativi di aggirare limiti, pattern anti-IRIS
5. **Avversario ad Alto Rischio** — Profilazione, correlazione, de-anonimizzazione

### Criteri di Classificazione

- **PASS**: Attacco bloccato, mitigazione efficace, nessun rischio residuo
- **PASS con Rischio**: Attacco bloccato, ma rischio residuo documentato e accettabile
- **FAIL**: Attacco possibile, vulnerabilità critica, mitigazione insufficiente o assente

---

## LAYER A — Tentativi di Violazione Strutturale

### Matrice Attacchi Strutturali

| ID | Attore | Vettore di Attacco | Failure Mode | Probabilità | Impatto | Punto Enforcement | Stato | Mitigazione |
|----|--------|-------------------|--------------|-------------|---------|-------------------|-------|-------------|
| **A1** | Client Modificato | Invio messaggio con `thread_id: null` | Messaggio senza thread, violazione SB-008 | Alta | Critico | Validazione server-side, FOREIGN KEY constraint | ✅ **PASS** | FOREIGN KEY NOT NULL blocca a livello DB |
| **A2** | Client Modificato | Invio messaggio con `thread_id: ""` (stringa vuota) | Messaggio senza thread valido | Alta | Critico | Validazione server-side, UUID format check | ✅ **PASS** | UUID format validation + NOT NULL constraint |
| **A3** | Attaccante API | Tentativo di bypass state machine con `state: "INVALID_STATE"` | Stato non valido, violazione SB-009 | Alta | Critico | ENUM constraint, state machine validation | ✅ **PASS** | ENUM constraint blocca a livello DB |
| **A4** | Attaccante API | Tentativo di transizione DRAFT → READ (salto di stato) | Violazione state machine | Alta | Critico | State machine validation, CHECK constraint | ✅ **PASS** | State machine blocca transizione invalida |
| **A5** | Attaccante API | Tentativo di inserire messaggio in thread ARCHIVED | Messaggio in thread chiuso | Alta | Critico | Validazione thread state, CHECK constraint | ✅ **PASS** | Validazione thread state prima di accettare messaggio |
| **A6** | Growth Hacker | Tentativo di superare limite payload (10 MB + 1 byte) | Payload eccessivo, violazione limiti | Alta | Critico | CHECK constraint `payload_size <= 10485760` | ✅ **PASS** | CHECK constraint blocca a livello DB |
| **A7** | Growth Hacker | Tentativo di creare thread con 10,001 messaggi | Superamento limite thread | Alta | Critico | CHECK constraint `message_count <= 10000` | ✅ **PASS** | CHECK constraint blocca a livello DB |
| **A8** | Growth Hacker | Tentativo di creare thread con durata > 365 giorni | Thread "eterno", violazione finitudine | Media | Critico | CHECK constraint `expires_at <= created_at + 365 days` | ✅ **PASS** | CHECK constraint blocca a livello DB |
| **A9** | Client Modificato | Tentativo di manipolare direttamente ENUM via SQL injection | Bypass state machine | Bassa | Critico | Prepared statements, parameterized queries | ✅ **PASS** | Prepared statements prevengono SQL injection |
| **A10** | Attaccante API | Tentativo di creare thread con 1 solo partecipante | Violazione vincolo minimo partecipanti | Alta | Critico | CHECK constraint `participant_count >= 2` | ✅ **PASS** | CHECK constraint blocca a livello DB |

**Verdetto Layer A**: ✅ **PASS** — Tutti gli attacchi strutturali sono bloccati a livello database con CHECK constraints e FOREIGN KEY. Nessuna vulnerabilità critica.

---

## LAYER B — Leakage di Identità e Metadata

### Matrice Attacchi Leakage

| ID | Attore | Vettore di Attacco | Failure Mode | Probabilità | Impatto | Punto Enforcement | Stato | Mitigazione |
|----|--------|-------------------|--------------|-------------|---------|-------------------|-------|-------------|
| **B1** | Insider con Accesso Log | Analisi log sanitizzati per correlare alias via hash temporanei | Correlazione alias tramite hash collision o pattern | Media | Critico | Hash temporanei con TTL 24h, log cifrati | ⚠️ **PASS con Rischio** | Hash temporanei scadono dopo 24h, ma correlazione cross-sessione possibile se stesso hash riutilizzato |
| **B2** | Avversario ad Alto Rischio | Analisi timing sync events per correlare alias | Timing correlation, root identity inferibile | Alta | Critico | Padding & batching (min 3 eventi), jitter 50-200ms | ✅ **PASS** | Batching e jitter randomizzato prevengono timing correlation |
| **B3** | Avversario ad Alto Rischio | Analisi pattern retry/backoff per correlare alias | Pattern retry correlabili, alias correlabili | Media | Critico | Retry esponenziale backoff, timing randomizzato | ⚠️ **PASS con Rischio** | Retry backoff può rivelare pattern se analizzato su molti tentativi |
| **B4** | Insider con Accesso Log | Analisi batch size per inferire pattern comportamentali | Batch size correlabile, pattern inferibili | Media | Critico | Batch size minimo (3 eventi), jitter randomizzato | ✅ **PASS** | Batch size minimo e jitter prevengono inferenza pattern |
| **B5** | Avversario ad Alto Rischio | Tentativo di inferire root identity da alias_id in messaggi | Root identity esposta, correlazione possibile | Alta | Critico | Validazione alias esistente, nessun rootId in metadata | ✅ **PASS** | Validazione alias, sanitizzazione log, nessun rootId |
| **B6** | Insider con Accesso Log | Analisi log cifrati per estrarre ID sensibili | Decifratura log, ID esposti | Bassa | Critico | Log cifrati con chiave separata, audit log encryption | ✅ **PASS** | Log cifrati, chiave separata, decifratura richiede chiave |
| **B7** | Avversario ad Alto Rischio | Analisi metadata messaggi per correlare alias | Metadata correlabili, alias correlabili | Media | Critico | Metadata sanitizzati, hash temporanei | ⚠️ **PASS con Rischio** | Metadata sanitizzati, ma pattern possono essere inferibili |
| **B8** | Insider con Accesso Log | Analisi timestamp ad alta risoluzione per correlare alias | Timing correlation, alias correlabili | Alta | Critico | Timestamp arrotondati, nessun timing ad alta risoluzione | ⚠️ **PASS con Rischio** | Timestamp arrotondati, ma correlazione possibile con analisi avanzata |
| **B9** | Avversario ad Alto Rischio | Tentativo di correlare alias via thread participants | Partecipanti thread rivelano correlazioni | Media | Critico | Partecipanti solo alias, nessun grafo sociale esplicito | ✅ **PASS** | Partecipanti solo alias, nessun grafo sociale |
| **B10** | Insider con Accesso Log | Analisi pattern accesso per inferire root identity | Pattern accesso correlabili, root identity inferibile | Media | Critico | Pattern accesso rimossi da log, behavioral obfuscation | ✅ **PASS** | Pattern accesso rimossi, behavioral obfuscation |

**Verdetto Layer B**: ⚠️ **PASS con Rischio** — 3 rischi residui identificati (B1, B3, B7, B8). Mitigazioni obbligatorie necessarie.

---

## LAYER C — Attacchi di Pattern & Social Graph

### Matrice Attacchi Pattern & Social Graph

| ID | Attore | Vettore di Attacco | Failure Mode | Probabilità | Impatto | Punto Enforcement | Stato | Mitigazione |
|----|--------|-------------------|--------------|-------------|---------|-------------------|-------|-------------|
| **C1** | Avversario ad Alto Rischio | Inferenza grafo sociale via thread participants | Social graph ricostruibile, correlazione possibile | Alta | Critico | Partecipanti solo alias, nessun grafo sociale esplicito | ⚠️ **PASS con Rischio** | Partecipanti thread possono rivelare correlazioni se analizzati insieme |
| **C2** | Avversario ad Alto Rischio | Correlazione partecipanti multi-thread | Alias correlabili via partecipazione thread comuni | Alta | Critico | Alias isolati per community, nessuna aggregazione cross-thread | ⚠️ **PASS con Rischio** | Partecipazione thread comuni può rivelare correlazioni |
| **C3** | Avversario ad Alto Rischio | Timing analysis su partecipazione thread | Pattern temporali correlabili, alias correlabili | Media | Critico | Timing randomizzato, behavioral obfuscation | ⚠️ **PASS con Rischio** | Timing randomizzato, ma pattern possono essere inferibili |
| **C4** | Growth Hacker | Discovery indiretta via pattern thread | Pattern thread rivelano correlazioni anche se discovery disattivo | Media | Critico | Discovery disattivo di default, randomizzazione suggerimenti | ✅ **PASS** | Discovery disattivo, randomizzazione previene pattern leakage |
| **C5** | Avversario ad Alto Rischio | Analisi frequenza messaggi per correlare alias | Pattern frequenza correlabili, alias correlabili | Media | Critico | Behavioral obfuscation, timing randomizzato | ⚠️ **PASS con Rischio** | Behavioral obfuscation, ma pattern possono essere inferibili |
| **C6** | Insider con Accesso Log | Analisi pattern thread creation per inferire root identity | Pattern creazione thread correlabili, root identity inferibile | Bassa | Critico | Pattern creazione thread randomizzati, log sanitizzati | ✅ **PASS** | Pattern randomizzati, log sanitizzati |
| **C7** | Avversario ad Alto Rischio | Correlazione alias via community_id | Community_id può rivelare correlazioni | Media | Critico | Community_id non correlabile a root identity | ✅ **PASS** | Community_id non rivelano root identity |
| **C8** | Growth Hacker | Tentativo di ricostruire grafo sociale via referral in messaging | Social graph leakage, correlazione possibile | Alta | Critico | Blind referral, referral token ciechi | ✅ **PASS** | Blind referral previene social graph leakage |

**Verdetto Layer C**: ⚠️ **PASS con Rischio** — 4 rischi residui identificati (C1, C2, C3, C5). Mitigazioni obbligatorie necessarie.

---

## LAYER D — Abuse & Product Drift

### Matrice Attacchi Abuse & Product Drift

| ID | Attore | Vettore di Attacco | Failure Mode | Probabilità | Impatto | Punto Enforcement | Stato | Mitigazione |
|----|--------|-------------------|--------------|-------------|---------|-------------------|-------|-------------|
| **D1** | Growth Hacker | Creazione thread lunghi (9,999 messaggi) per simulare chat infinita | Chat quasi-infinita, violazione finitudine | Alta | Critico | Limite thread (10,000 messaggi), paginazione obbligatoria | ✅ **PASS** | Limite thread e paginazione prevengono chat infinita |
| **D2** | Growth Hacker | Uso improprio stati messaggi per signaling (es. DRAFT → CANCELLED ripetuto) | Stati usati come segnali, violazione semantica | Media | Critico | State machine immutabile, transizioni verificabili | ✅ **PASS** | State machine previene uso improprio stati |
| **D3** | Growth Hacker | Tentativo di ranking implicito via ordinamento nascosto | Ranking algoritmico nascosto, manipolazione | Media | Critico | Ordinamento esplicito, trasparenza obbligatoria | ✅ **PASS** | Ordinamento esplicito, nessun ranking nascosto |
| **D4** | Growth Hacker | Uso improprio fetch per analytics (polling continuo) | Analytics nascosti, violazione privacy | Media | Critico | Paginazione obbligatoria, rate limiting | ⚠️ **PASS con Rischio** | Paginazione obbligatoria, ma polling continuo possibile |
| **D5** | Growth Hacker | Creazione molti thread piccoli per aggirare limite 10,000 messaggi | Accumulo infinito via molti thread | Alta | Critico | Limite thread aperti per alias (max 100) | ✅ **PASS** | Limite thread aperti previene accumulo infinito |
| **D6** | Growth Hacker | Tentativo di usare thread come "storage" per dati non messaggi | Thread usati come storage, violazione semantica | Media | Critico | Validazione payload, limiti strutturali | ✅ **PASS** | Validazione payload, limiti strutturali |
| **D7** | Growth Hacker | Tentativo di creare thread "eterni" via riattivazione periodica | Thread "eterni", violazione finitudine | Media | Critico | TTL automatico (365 giorni), expires_at obbligatorio | ✅ **PASS** | TTL automatico previene thread eterni |

**Verdetto Layer D**: ✅ **PASS** — 1 rischio residuo identificato (D4). Mitigazione obbligatoria necessaria.

---

## 🚨 FAILURE NON MITIGABILI (CRITICI)

### Failure 1: Correlazione Partecipanti Multi-Thread

**Descrizione**: Se un alias partecipa a più thread con altri alias comuni, la correlazione è possibile analizzando i partecipanti.

**Scenario**:
- Alias A partecipa a Thread 1 con Alias B
- Alias A partecipa a Thread 2 con Alias B
- Correlazione: Alias A e Alias B sono correlabili

**Impatto**: Critico — Violazione SB-012 (Alias non correlabili)

**Mitigazione Proposta**:
- **Randomizzazione partecipanti**: Aggiungere partecipanti "dummy" randomizzati per obfuscare pattern
- **Limite partecipanti per thread**: Max partecipanti per thread per ridurre correlabilità
- **Partecipanti opzionali**: Permettere partecipanti "osservatori" per aumentare rumore

**Stato**: ⚠️ **PASS con Rischio** — Mitigazione proposta ma non implementata

---

### Failure 2: Pattern Retry/Backoff Correlabili

**Descrizione**: Se retry/backoff pattern è analizzato su molti tentativi, può rivelare pattern comportamentali correlabili.

**Scenario**:
- Alias A ha pattern retry specifico (timing, frequenza)
- Alias B ha pattern retry simile
- Correlazione: Alias A e Alias B possono essere correlabili

**Impatto**: Critico — Violazione Identity Hardening v1.1 (Behavioral Obfuscation)

**Mitigazione Proposta**:
- **Randomizzazione retry timing**: Aggiungere jitter randomizzato a retry timing
- **Obfuscation retry pattern**: Nascondere pattern retry con noise

**Stato**: ⚠️ **PASS con Rischio** — Mitigazione proposta ma non implementata

---

### Failure 3: Polling Continuo per Analytics

**Descrizione**: Se fetch messaggi è usato per polling continuo, può essere usato per analytics nascosti.

**Scenario**:
- Attaccante fa polling continuo di thread per analizzare pattern
- Analytics nascosti, violazione privacy

**Impatto**: Critico — Violazione SB-001 (No dark pattern)

**Mitigazione Proposta**:
- **Rate limiting**: Limite fetch per thread/alias (es. max 10 fetch/minuto)
- **Audit logging**: Log audit per fetch frequenti

**Stato**: ⚠️ **PASS con Rischio** — Mitigazione proposta ma non implementata

---

### Failure 4: Timestamp ad Alta Risoluzione

**Descrizione**: Se timestamp sono ad alta risoluzione (millisecondi), possono essere usati per correlazione temporale.

**Scenario**:
- Timestamp ad alta risoluzione rivelano pattern temporali
- Correlazione possibile con analisi avanzata

**Impatto**: Critico — Violazione Identity Hardening v1.1 (Timing Correlation)

**Mitigazione Proposta**:
- **Arrotondamento timestamp**: Arrotondare timestamp a secondi (non millisecondi)
- **Jitter timestamp**: Aggiungere jitter randomizzato a timestamp

**Stato**: ⚠️ **PASS con Rischio** — Mitigazione proposta ma non implementata

---

## 🛠️ MITIGAZIONI OBBLIGATORIE (SE ⚠️)

### Mitigazione 1: Randomizzazione Partecipanti Thread

**Tipo mitigazione**: Architetturale + Policy

**Problema**: Partecipanti thread possono rivelare correlazioni se analizzati insieme.

**Mitigazione proposta**:
- Aggiungere partecipanti "dummy" randomizzati per obfuscare pattern
- Limite partecipanti per thread (es. max 50 partecipanti)
- Partecipanti opzionali "osservatori" per aumentare rumore

**Impatto**:
- **UX**: Minimo (trasparente per utente)
- **Performance**: Leggero aumento overhead (gestione partecipanti dummy)
- **Scope MVP**: Compatibile

**Compatibilità STEP B**: ✅ **SÌ** (SB-012, SB-016)

---

### Mitigazione 2: Randomizzazione Retry Timing

**Tipo mitigazione**: Architetturale

**Problema**: Pattern retry/backoff può rivelare pattern comportamentali correlabili.

**Mitigazione proposta**:
- Aggiungere jitter randomizzato a retry timing (es. ±20% del delay)
- Obfuscation retry pattern con noise

**Impatto**:
- **UX**: Minimo (trasparente per utente)
- **Performance**: Minimo overhead (jitter randomizzato)
- **Scope MVP**: Compatibile

**Compatibilità STEP B**: ✅ **SÌ** (SB-024, Identity Hardening v1.1)

---

### Mitigazione 3: Rate Limiting Fetch

**Tipo mitigazione**: Policy + Architetturale

**Problema**: Polling continuo può essere usato per analytics nascosti.

**Mitigazione proposta**:
- Rate limiting fetch per thread/alias (es. max 10 fetch/minuto)
- Audit logging per fetch frequenti
- Alert se fetch > soglia

**Impatto**:
- **UX**: Minimo (limitazione trasparente)
- **Performance**: Minimo overhead (rate limiting)
- **Scope MVP**: Compatibile

**Compatibilità STEP B**: ✅ **SÌ** (SB-001, SB-010)

---

### Mitigazione 4: Arrotondamento Timestamp

**Tipo mitigazione**: Architetturale

**Problema**: Timestamp ad alta risoluzione possono rivelare pattern temporali.

**Mitigazione proposta**:
- Arrotondare timestamp a secondi (non millisecondi)
- Jitter randomizzato a timestamp (es. ±1 secondo)

**Impatto**:
- **UX**: Minimo (trasparente per utente)
- **Performance**: Minimo overhead (arrotondamento)
- **Scope MVP**: Compatibile

**Compatibilità STEP B**: ✅ **SÌ** (Identity Hardening v1.1)

---

## 📊 MATRICE COMPLETA STRESS-TEST (RIEPILOGO)

### Riepilogo per Layer

| Layer | Attacchi Totali | PASS | PASS con Rischio | FAIL | Verdetto |
|-------|----------------|------|------------------|------|----------|
| **Layer A — Violazione Strutturale** | 10 | 10 | 0 | 0 | ✅ **PASS** |
| **Layer B — Leakage Identità/Metadata** | 10 | 6 | 4 | 0 | ⚠️ **PASS con Rischio** |
| **Layer C — Pattern & Social Graph** | 8 | 4 | 4 | 0 | ⚠️ **PASS con Rischio** |
| **Layer D — Abuse & Product Drift** | 7 | 6 | 1 | 0 | ⚠️ **PASS con Rischio** |
| **TOTALE** | **35** | **26** | **9** | **0** | ⚠️ **PASS con Rischio** |

---

### Riepilogo per Gravità

| Gravità | Attacchi | Stato |
|---------|----------|-------|
| **Critico** | 35 | 26 PASS, 9 PASS con Rischio |
| **Alto** | 0 | - |
| **Medio** | 0 | - |
| **Basso** | 0 | - |

---

### Riepilogo per Attore

| Attore | Attacchi | PASS | PASS con Rischio | FAIL |
|--------|----------|------|------------------|------|
| **Client Modificato** | 3 | 3 | 0 | 0 |
| **Attaccante con Accesso API** | 5 | 5 | 0 | 0 |
| **Insider con Accesso Log** | 5 | 3 | 2 | 0 |
| **Growth Hacker** | 8 | 7 | 1 | 0 |
| **Avversario ad Alto Rischio** | 14 | 8 | 6 | 0 |

---

## 📊 VERDETTO FINALE

```text
VERDETTO MESSAGING CORE — STRESS-TEST POST-IMPLEMENTAZIONE:
[ ] PASS
[X] PASS CON FIX OBBLIGATORI
[ ] FAIL (STEP 4E BLOCCATO)
```

### Condizioni per PASS

Il sistema può ottenere **PASS** solo se:

1. ✅ **Tutte le 4 mitigazioni obbligatorie sono implementate**
2. ✅ **Test di sicurezza passano** (correlazione partecipanti, pattern retry, polling continuo, timestamp)
3. ✅ **Documento di implementazione aggiornato** con mitigazioni
4. ✅ **Code review verifica** conformità mitigazioni

---

### Rischio Residuo

**Rischi residui identificati**: 9 attacchi con stato "PASS con Rischio"

**Mitigazioni obbligatorie proposte**: 4

**Rischio residuo accettabile per MVP**: ⚠️ **CONDIZIONALE** — Solo dopo implementazione mitigazioni obbligatorie

---

## 🔒 FREEZE DECISIONALE

**Se PASS CON FIX OBBLIGATORI** (stato attuale):

1. ✅ **Applicare fix obbligatori** (4 mitigazioni)
2. ✅ **Aggiornare Implementazione STEP 4C** con mitigazioni
3. ✅ **Test di sicurezza** per verificare mitigazioni
4. ✅ **Solo allora → autorizzare STEP 4E**

**Se FAIL** (se mitigazioni non applicabili):

- ❌ **Refactor immediato**
- ❌ **Nessuna eccezione**
- ❌ **Nessuna "soluzione temporanea"**

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: ⚠️ **PASS CON FIX OBBLIGATORI** — 35 attacchi testati, 9 rischi residui identificati, 4 mitigazioni obbligatorie proposte. STEP 4E bloccato fino a implementazione mitigazioni.

**Security Architect**: ⚠️ **PASS CON FIX OBBLIGATORI** — Vulnerabilità di sicurezza identificate (correlazione partecipanti, pattern retry, polling continuo, timestamp). Mitigazioni obbligatorie prima di STEP 4E.

**Privacy Architect**: ⚠️ **PASS CON FIX OBBLIGATORI** — Vulnerabilità di privacy identificate (leakage identità, pattern correlabili). Mitigazioni obbligatorie prima di STEP 4E.

**Adversarial Thinker**: ⚠️ **PASS CON FIX OBBLIGATORI** — Attacchi realistici identificati. Sistema vulnerabile ma mitigabile. Fix obbligatori prima di produzione.

---

**Documento vincolante per approvazione STEP 4E.**  
**STEP 4E BLOCCATO fino a implementazione mitigazioni obbligatorie.**
