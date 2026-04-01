---
title: "IRIS — UX Threat Modeling Manuale STEP 4E.5 v1.0"
author: "Principal Engineer + UX Security Analyst + Adversarial UX Thinker"
version: "1.0"
date: "2026-01-24"
status: "OBBLIGATORIO — Gate STEP 4F"
dependencies: "IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md, IRIS_Messaging_Core_Architecture_Freeze_STEP4A_v1.0.md"
tags: ["FASE2", "Messaging", "STEP4E5", "UX", "Threat-Modeling", "Security", "Gate"]
---

# IRIS — UX Threat Modeling Manuale STEP 4E.5 v1.0

> Threat Model UX manuale per identificare come utenti reali ostili o devianti possano rompere il sistema attraverso l'uso umano della UI.  
> **Gate obbligatorio**: STEP 4F (UX Stress-Test Ostile) NON può iniziare finché questo documento non è completato e approvato.

---

## 🎯 OBIETTIVO

Costruire un **Threat Model UX manuale**, pensando **come utenti reali ostili o devianti**, non come sviluppatori.

Qui **non si scrive codice**.  
Qui **non si difende la UI**.  
Qui si cerca di **rompere il sistema attraverso l'uso umano**.

L'output sarà **input diretto per STEP 4F (UX Stress-Test Ostile)**.

---

## 📌 CONTESTO VINCOLANTE (NON NEGOZIABILE)

Stai operando nel progetto **IRIS**, FASE 2 — Messaging Core.

Sono **vincolanti** i seguenti documenti (da considerare già congelati):

- `IRIS_Messaging_Core_Architecture_Freeze_STEP4A_v1.0.md`
- `IRIS_Messaging_Core_Principio_Vincolo_StressTest_EarlyAdopter_STEP4B_v1.0.md`
- `IRIS_Messaging_Core_Implementation_STEP4C_v1.1_Hardening.md`
- `IRIS_StressTest_Ostile_Messaging_Core_STEP4D_v1.1_PostHardening.md`
- `IRIS_Messaging_Hardening_STEP4D5_v1.0.md`
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md`

La UI è **una proiezione passiva e deterministica**.  
Non può introdurre logica, ranking, realtime, inferenze, né aggirare vincoli strutturali.

---

## 🧠 MODALITÀ DI ANALISI (OBBLIGATORIA)

Per ogni scenario:

- Parti dal punto di vista dell'utente
- Assumi che l'utente:
  - non legga documentazione
  - non segua intenti "etici"
  - cerchi shortcut cognitivi
  - sfrutti ripetizione, pattern, ambiguità
- Non assumere bug tecnici
- Non assumere accesso privilegiato
- Usa **solo ciò che la UI consente**

---

## 1. ARCHETIPI DI ATTACCANTE UX

### 1.1 Power User Ossessivo

**Nome**: Power User Ossessivo  
**Motivazione primaria**: Controllo totale, ottimizzazione personale, bypass di limiti percepiti  
**Capacità**: Tecniche basse, cognitive alte, pattern recognition avanzato, memoria procedurale  
**Obiettivo UX**: Sfruttare ogni pattern ripetibile, automatizzare mentalmente, ricostruire informazioni nascoste

**Comportamenti tipici**:
- Memorizza pattern di ordinamento thread
- Traccia manualmente timestamp per correlazione
- Usa thread come "database personale"
- Sfrutta ripetizione per inferire priorità

---

### 1.2 Moderatore Autoritario

**Nome**: Moderatore Autoritario  
**Motivazione primaria**: Controllo sociale, enforcement di norme, identificazione devianti  
**Capacità**: Tecniche basse, cognitive medie, autorità percepita, accesso a più thread  
**Obiettivo UX**: Identificare utenti problematici, ricostruire grafo sociale, applicare pressione sociale

**Comportamenti tipici**:
- Analizza pattern partecipanti thread
- Correla alias tra thread diversi
- Usa stato messaggi per inferire comportamento
- Sfrutta discovery per mappare community

---

### 1.3 Utente Solitario Compulsivo

**Nome**: Utente Solitario Compulsivo  
**Motivazione primaria**: Evitare isolamento, creare dipendenza, validazione continua  
**Capacità**: Tecniche basse, cognitive basse, emotività alta, pattern di dipendenza  
**Obiettivo UX**: Creare loop di engagement, forzare risposte, normalizzare comunicazione asimmetrica

**Comportamenti tipici**:
- Spam di messaggi per forzare risposta
- Uso strategico di thread multipli
- Gaming dello stato (READ, DELIVERED)
- Creazione di dipendenza tramite pattern temporali

---

### 1.4 Manipolatore Sociale

**Nome**: Manipolatore Sociale  
**Motivazione primaria**: Controllo relazionale, influenza, creazione di gerarchie implicite  
**Capacità**: Tecniche basse, cognitive alte, empatia strumentale, pattern sociali  
**Obiettivo UX**: Creare gerarchie implicite, sfruttare timing per pressione, normalizzare comportamenti asimmetrici

**Comportamenti tipici**:
- Uso strategico del silenzio / non-risposta
- Timing messaggi per massimizzare impatto
- Creazione thread multipli per frammentare contesto
- Sfruttamento di errori visibili per creare dipendenza

---

### 1.5 Osservatore Passivo (Lurker)

**Nome**: Osservatore Passivo (Lurker)  
**Motivazione primaria**: Raccolta informazioni, profilazione passiva, inferenza pattern  
**Capacità**: Tecniche basse, cognitive medie, pazienza alta, pattern recognition  
**Obiettivo UX**: Ricostruire grafo sociale, inferire priorità, correlare identità senza interagire

**Comportamenti tipici**:
- Navigazione passiva tra thread
- Tracciamento manuale timestamp
- Analisi pattern partecipanti
- Correlazione cross-thread senza intervento

---

### 1.6 Utente Multi-Account Strategico

**Nome**: Utente Multi-Account Strategico  
**Motivazione primaria**: Bypass limiti, creare consenso artificiale, gaming sistema  
**Capacità**: Tecniche medie, cognitive alte, organizzazione, coordinamento  
**Obiettivo UX**: Creare network artificiale, simulare engagement, bypass rate limit percepiti

**Comportamenti tipici**:
- Creazione alias multipli per stesso utente
- Coordinamento tra account per pattern
- Uso thread multipli per simulare attività
- Gaming referral controllato

---

## 2. CLASSI DI ATTACCO UX (OBBLIGATORIE)

### 2.1 Bypass della Finitudine Percepita

**Descrizione**: L'utente percepisce la finitudine come limitazione arbitraria e cerca di aggirarla.

**Pattern cognitivi sfruttati**:
- Creazione thread multipli per simulare "chat infinita"
- Uso strategico di archiviazione/riattivazione
- Paginazione come "limite tecnico" da aggirare

**Rischio**: Violazione principio "Relazioni > traffico", normalizzazione chat infinita mascherata.

---

### 2.2 Ricostruzione Implicita del Grafo Sociale

**Descrizione**: L'utente ricostruisce manualmente il grafo sociale attraverso pattern osservabili.

**Pattern cognitivi sfruttati**:
- Tracciamento partecipanti thread comuni
- Correlazione temporale di partecipazione
- Analisi pattern discovery (anche se randomizzato)

**Rischio**: Violazione privacy, correlazione alias, esposizione relazioni.

---

### 2.3 Inferenza di Priorità / Importanza

**Descrizione**: L'utente inferisce priorità o importanza attraverso pattern UI non intenzionali.

**Pattern cognitivi sfruttati**:
- Ordinamento thread (anche se statico)
- Timing di aggiornamento
- Pattern di partecipazione

**Rischio**: Creazione gerarchie implicite, violazione principio "no ranking nascosto".

---

### 2.4 Forzatura di Realtime Percepito

**Descrizione**: L'utente crea pattern che simulano realtime anche se non esiste.

**Pattern cognitivi sfruttati**:
- Polling manuale frequente
- Pattern di risposta immediata
- Uso errori/retry per inferire stato

**Rischio**: Normalizzazione dipendenza, violazione principio "offline-first".

---

### 2.5 Pattern di Dipendenza Comportamentale

**Descrizione**: L'utente sviluppa pattern compulsivi attraverso ripetizione UI.

**Pattern cognitivi sfruttati**:
- Loop di check thread
- Pattern di risposta obbligata
- Gaming stato messaggi per validazione

**Rischio**: Violazione principio "no dark pattern", dipendenza comportamentale.

---

### 2.6 Correlazione Temporale Manuale

**Descrizione**: L'utente traccia manualmente timestamp per correlare eventi.

**Pattern cognitivi sfruttati**:
- Memorizzazione timestamp arrotondati
- Pattern di partecipazione temporale
- Correlazione cross-thread manuale

**Rischio**: Violazione privacy, correlazione alias, inferenza comportamento.

---

### 2.7 Abuse di Errori e Retry Visibili

**Descrizione**: L'utente sfrutta errori visibili per inferire stato sistema o creare dipendenza.

**Pattern cognitivi sfruttati**:
- Pattern errori per inferire stato
- Uso retry per creare aspettativa
- Gaming rate limit visibili

**Rischio**: Violazione principio "gestione errori esplicita", creazione dipendenza.

---

### 2.8 Gaming dello Stato (READ, DELIVERED, etc.)

**Descrizione**: L'utente usa stati messaggi per creare pressione sociale o inferire comportamento.

**Pattern cognitivi sfruttati**:
- Timing lettura per creare pressione
- Uso stato per inferire disponibilità
- Gaming stato per creare aspettative

**Rischio**: Violazione principio "stato esplicito", creazione pressione sociale.

---

### 2.9 Uso Strategico del Silenzio / Non-Risposta

**Descrizione**: L'utente usa assenza di risposta come strumento di controllo.

**Pattern cognitivi sfruttati**:
- Pattern silenzio per creare ansia
- Uso thread multipli per frammentare contesto
- Gaming timing per massimizzare impatto

**Rischio**: Violazione principio "relazioni > traffico", creazione controllo asimmetrico.

---

### 2.10 Pattern di Controllo tramite Thread

**Descrizione**: L'utente usa thread come strumento di controllo relazionale.

**Pattern cognitivi sfruttati**:
- Creazione thread multipli per frammentare
- Uso thread per isolare partecipanti
- Gaming stato thread per controllo

**Rischio**: Violazione principio "thread obbligatori", abuso struttura relazionale.

---

## 3. SCENARI OSTILI UX (MINIMO 25)

### Scenario UX-01: Thread Multipli per Chat Infinita

**ID**: UX-01  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente crea thread A, invia 100 messaggi
2. Thread A raggiunge limite, utente crea thread B
3. Thread B raggiunge limite, utente crea thread C
4. Pattern ripetuto per simulare "chat infinita"

**Pattern cognitivo sfruttato**: Percezione limite come "tecnico", non "strutturale"

**Rischio generato**: Violazione finitudine, normalizzazione chat infinita mascherata

**Severità**: Alta

**Vincoli IRIS toccati**: STEP B #3 (IRIS = Protocollo di Relazione), STEP 4A §6 (Limiti strutturali)

**Mitigazione già presente**: Limite thread aperti per alias (max 100)

**Gap residuo**: Utente può creare 100 thread sequenziali, simulando chat infinita

---

### Scenario UX-02: Tracciamento Partecipanti per Correlazione

**ID**: UX-02  
**Archetipo**: Moderatore Autoritario  
**Sequenza azioni UI**:
1. Utente naviga thread A, memorizza partecipanti (ordine randomizzato)
2. Utente naviga thread B, memorizza partecipanti
3. Utente identifica partecipanti comuni tra A e B
4. Pattern ripetuto per ricostruire grafo sociale

**Pattern cognitivo sfruttato**: Memoria procedurale, pattern recognition

**Rischio generato**: Correlazione alias, ricostruzione grafo sociale

**Severità**: Critica

**Vincoli IRIS toccati**: STEP 4D.5 §1 (Randomizzazione Partecipanti), Identity Hardening v1.1

**Mitigazione già presente**: Randomizzazione ordine partecipanti per ogni fetch

**Gap residuo**: Utente può tracciare manualmente pattern su molti thread, correlazione statistica possibile

---

### Scenario UX-03: Inferenza Priorità tramite Ordinamento

**ID**: UX-03  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente osserva ordinamento thread (es. "per data ultimo evento, decrescente")
2. Utente memorizza pattern ordinamento
3. Utente inferisce "priorità" basata su posizione thread
4. Utente agisce in base a priorità inferita

**Pattern cognitivo sfruttato**: Associazione posizione → importanza

**Rischio generato**: Creazione gerarchie implicite, violazione "no ranking nascosto"

**Severità**: Media

**Vincoli IRIS toccati**: STEP B #1 (No dark pattern), STEP 4A §5.2.3 (Ranking messaggi invisibile)

**Mitigazione già presente**: Ordinamento statico documentato, nessun ranking "intelligente"

**Gap residuo**: Utente può inferire priorità anche da ordinamento statico, pattern cognitivo inevitabile

---

### Scenario UX-04: Polling Manuale per Realtime Percepito

**ID**: UX-04  
**Archetipo**: Utente Solitario Compulsivo  
**Sequenza azioni UI**:
1. Utente apre thread, legge messaggi
2. Utente chiude thread, riapre dopo 5 secondi
3. Pattern ripetuto ogni 5-10 secondi
4. Utente crea pattern "realtime percepito"

**Pattern cognitivo sfruttato**: Loop comportamentale, dipendenza da feedback

**Rischio generato**: Dipendenza comportamentale, violazione "offline-first"

**Severità**: Alta

**Vincoli IRIS toccati**: STEP 4D.5 §3 (Rate Limit Hard), STEP 4A §7 (Delivery & Offline-First)

**Mitigazione già presente**: Rate limit hard (max 10 fetch/minuto), kill-switch automatico

**Gap residuo**: Utente può comunque creare pattern compulsivo, anche se limitato

---

### Scenario UX-05: Gaming Stato READ per Pressione Sociale

**ID**: UX-05  
**Archetipo**: Manipolatore Sociale  
**Sequenza azioni UI**:
1. Utente A invia messaggio a Utente B
2. Utente A monitora stato messaggio (SENT → DELIVERED → READ)
3. Utente A inferisce disponibilità Utente B da timing lettura
4. Utente A usa timing per creare pressione sociale

**Pattern cognitivo sfruttato**: Associazione stato → comportamento, pressione sociale

**Rischio generato**: Violazione privacy, creazione pressione sociale

**Severità**: Alta

**Vincoli IRIS toccati**: STEP 4A §5.2.5 (Read Receipt Non Controllabili), STEP 4E §4 (Assenza di realtime)

**Mitigazione già presente**: Stato esplicito, nessun "last seen"

**Gap residuo**: Stato READ è visibile, utente può inferire comportamento da timing

---

### Scenario UX-06: Correlazione Timestamp Manuale

**ID**: UX-06  
**Archetipo**: Osservatore Passivo (Lurker)  
**Sequenza azioni UI**:
1. Utente naviga thread A, memorizza timestamp arrotondati
2. Utente naviga thread B, memorizza timestamp
3. Utente identifica pattern temporali comuni
4. Utente correlazione alias basata su timing

**Pattern cognitivo sfruttato**: Pattern recognition temporale, memoria procedurale

**Rischio generato**: Correlazione alias, violazione privacy

**Severità**: Critica

**Vincoli IRIS toccati**: STEP 4D.5 §4 (Arrotondamento Timestamp), Identity Hardening v1.1

**Mitigazione già presente**: Timestamp arrotondati (bucket 5 secondi), jitter randomizzato

**Gap residuo**: Utente può tracciare manualmente pattern su molti thread, correlazione statistica possibile

---

### Scenario UX-07: Uso Strategico Silenzio per Controllo

**ID**: UX-07  
**Archetipo**: Manipolatore Sociale  
**Sequenza azioni UI**:
1. Utente A invia messaggio a Utente B
2. Utente A non riceve risposta per giorni
3. Utente A crea nuovo thread con stesso partecipante
4. Pattern ripetuto per creare pressione sociale

**Pattern cognitivo sfruttato**: Ansia da non-risposta, pressione sociale

**Rischio generato**: Controllo relazionale, violazione "relazioni > traffico"

**Severità**: Media

**Vincoli IRIS toccati**: STEP B #3 (IRIS = Protocollo di Relazione), STEP 4A §1.1 (Messaging come Atto Relazionale)

**Mitigazione già presente**: Thread obbligatori, nessun DM senza thread

**Gap residuo**: Utente può comunque creare pattern di pressione attraverso thread multipli

---

### Scenario UX-08: Abuse Errori Visibili per Inferenza

**ID**: UX-08  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente tenta fetch messaggi, riceve errore rate limit
2. Utente inferisce stato sistema da pattern errori
3. Utente usa pattern errori per ottimizzare comportamento
4. Utente crea dipendenza da feedback errori

**Pattern cognitivo sfruttato**: Pattern recognition, dipendenza da feedback

**Rischio generato**: Violazione "gestione errori esplicita", creazione dipendenza

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP 4E §6 (Gestione Errori Obbigatoria), STEP 4D.5 §3 (Rate Limit Hard)

**Mitigazione già presente**: Errori espliciti, rate limit hard

**Gap residuo**: Utente può comunque inferire stato da pattern errori, inevitabile

---

### Scenario UX-09: Creazione Thread Multipli per Frammentazione

**ID**: UX-09  
**Archetipo**: Manipolatore Sociale  
**Sequenza azioni UI**:
1. Utente A crea thread 1 con Utente B (argomento X)
2. Utente A crea thread 2 con Utente B (argomento Y)
3. Utente A crea thread 3 con Utente B (argomento Z)
4. Pattern ripetuto per frammentare contesto

**Pattern cognitivo sfruttato**: Frammentazione contesto, controllo relazionale

**Rischio generato**: Violazione "thread obbligatori", abuso struttura relazionale

**Severità**: Media

**Vincoli IRIS toccati**: STEP 4A §1.6 (Nessuna Comunicazione Fuori da Thread), STEP B #4 (Thread obbligatori)

**Mitigazione già presente**: Thread obbligatori, nessun DM senza thread

**Gap residuo**: Utente può comunque creare thread multipli per frammentare, non bloccabile

---

### Scenario UX-10: Tracciamento Pattern Discovery

**ID**: UX-10  
**Archetipo**: Moderatore Autoritario  
**Sequenza azioni UI**:
1. Utente attiva discovery opt-in
2. Utente naviga suggerimenti, memorizza pattern
3. Utente identifica pattern ripetuti (anche se randomizzati)
4. Utente inferisce relazioni basate su suggerimenti

**Pattern cognitivo sfruttato**: Pattern recognition, memoria procedurale

**Rischio generato**: Correlazione alias, violazione privacy

**Severità**: Alta

**Vincoli IRIS toccati**: STEP 4A §4.8 (Discovery Opt-in Respected), Identity Hardening v1.1

**Mitigazione già presente**: Discovery randomizzato, opt-in esplicito, nessuna persistenza

**Gap residuo**: Utente può tracciare manualmente pattern su molti suggerimenti, correlazione statistica possibile

---

### Scenario UX-11: Gaming Referral Controllato

**ID**: UX-11  
**Archetipo**: Utente Multi-Account Strategico  
**Sequenza azioni UI**:
1. Utente crea alias A, invia referral a alias B (controllato)
2. Utente crea alias C, invia referral a alias D
3. Pattern ripetuto per simulare network artificiale
4. Utente gaming referral controllato per vantaggi

**Pattern cognitivo sfruttato**: Gaming sistema, coordinamento multi-account

**Rischio generato**: Violazione "no spam economy", crescita artificiale

**Severità**: Alta

**Vincoli IRIS toccati**: STEP B #2 (No spam economy), Identity Hardening v1.1 (Blind Referral)

**Mitigazione già presente**: Referral controllato, anti-fraud, trust-weighted

**Gap residuo**: Utente può comunque creare network artificiale con coordinamento, difficile da rilevare

---

### Scenario UX-12: Inferenza Disponibilità da Timing

**ID**: UX-12  
**Archetipo**: Utente Solitario Compulsivo  
**Sequenza azioni UI**:
1. Utente A invia messaggio a Utente B
2. Utente A monitora timing risposta (basato su timestamp arrotondati)
3. Utente A inferisce disponibilità Utente B da pattern timing
4. Utente A usa pattern per ottimizzare invio messaggi

**Pattern cognitivo sfruttato**: Pattern recognition temporale, ottimizzazione personale

**Rischio generato**: Violazione privacy, inferenza comportamento

**Severità**: Media

**Vincoli IRIS toccati**: STEP 4D.5 §4 (Arrotondamento Timestamp), STEP 4E §4 (Assenza di realtime)

**Mitigazione già presente**: Timestamp arrotondati, nessun "last seen"

**Gap residuo**: Utente può comunque inferire pattern da timing arrotondato, inevitabile

---

### Scenario UX-13: Uso Thread come Database Personale

**ID**: UX-13  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente crea thread "Note personali" con se stesso
2. Utente usa thread per archiviare informazioni
3. Utente sfrutta struttura thread come "database"
4. Pattern ripetuto per bypass limiti storage

**Pattern cognitivo sfruttato**: Riuso strumento per scopo non inteso

**Rischio generato**: Violazione "thread obbligatori", abuso struttura relazionale

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP 4A §1.6 (Nessuna Comunicazione Fuori da Thread), STEP B #4 (Thread obbligatori)

**Mitigazione già presente**: Thread obbligatori, limiti strutturali (10,000 messaggi, 365 giorni)

**Gap residuo**: Utente può comunque usare thread per storage, non bloccabile senza violare UX

---

### Scenario UX-14: Pattern Dipendenza da Check Thread

**ID**: UX-14  
**Archetipo**: Utente Solitario Compulsivo  
**Sequenza azioni UI**:
1. Utente apre app, controlla thread lista
2. Utente chiude app, riapre dopo 1 minuto
3. Pattern ripetuto ogni 1-2 minuti
4. Utente crea dipendenza comportamentale

**Pattern cognitivo sfruttato**: Loop comportamentale, dipendenza da feedback

**Rischio generato**: Violazione "no dark pattern", dipendenza comportamentale

**Severità**: Alta

**Vincoli IRIS toccati**: STEP B #1 (No dark pattern), STEP 4E §4 (Assenza di realtime)

**Mitigazione già presente**: Nessun push notification automatico, offline-first

**Gap residuo**: Utente può comunque creare pattern compulsivo, inevitabile senza bloccare UX

---

### Scenario UX-15: Correlazione Cross-Thread Manuale

**ID**: UX-15  
**Archetipo**: Osservatore Passivo (Lurker)  
**Sequenza azioni UI**:
1. Utente naviga thread A, memorizza partecipanti e timestamp
2. Utente naviga thread B, memorizza partecipanti e timestamp
3. Utente identifica pattern comuni tra A e B
4. Utente correlazione alias basata su pattern

**Pattern cognitivo sfruttato**: Pattern recognition, memoria procedurale, correlazione statistica

**Rischio generato**: Correlazione alias, violazione privacy

**Severità**: Critica

**Vincoli IRIS toccati**: STEP 4D.5 §1 (Randomizzazione Partecipanti), Identity Hardening v1.1

**Mitigazione già presente**: Randomizzazione ordine partecipanti, timestamp arrotondati

**Gap residuo**: Utente può tracciare manualmente pattern su molti thread, correlazione statistica possibile

---

### Scenario UX-16: Gaming Stato Thread per Controllo

**ID**: UX-16  
**Archetipo**: Manipolatore Sociale  
**Sequenza azioni UI**:
1. Utente A crea thread, invia messaggi
2. Utente A cambia stato thread (OPEN → PAUSED → CLOSED)
3. Utente A usa stato thread per creare pressione sociale
4. Pattern ripetuto per controllo relazionale

**Pattern cognitivo sfruttato**: Controllo struttura, pressione sociale

**Rischio generato**: Violazione "thread obbligatori", abuso struttura relazionale

**Severità**: Media

**Vincoli IRIS toccati**: STEP 4A §3 (Threading Obbligatorio), STEP 4C §2 (State Machine)

**Mitigazione già presente**: State machine thread, transizioni valide

**Gap residuo**: Utente può comunque usare stato thread per controllo, non bloccabile

---

### Scenario UX-17: Inferenza Priorità da Pattern Partecipazione

**ID**: UX-17  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente osserva pattern partecipazione thread
2. Utente identifica thread con più partecipanti
3. Utente inferisce "priorità" basata su partecipazione
4. Utente agisce in base a priorità inferita

**Pattern cognitivo sfruttato**: Associazione partecipazione → importanza

**Rischio generato**: Creazione gerarchie implicite, violazione "no ranking nascosto"

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP B #1 (No dark pattern), STEP 4A §5.2.3 (Ranking messaggi invisibile)

**Mitigazione già presente**: Nessun ranking "intelligente", ordinamento statico

**Gap residuo**: Utente può comunque inferire priorità da pattern, inevitabile

---

### Scenario UX-18: Uso Strategico Archiviazione

**ID**: UX-18  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente archivia thread A (raggiunge limite)
2. Utente crea thread B (continuazione A)
3. Pattern ripetuto per bypass limite thread
4. Utente simula "chat infinita" attraverso archiviazione

**Pattern cognitivo sfruttato**: Percezione limite come "tecnico", non "strutturale"

**Rischio generato**: Violazione finitudine, normalizzazione chat infinita mascherata

**Severità**: Alta

**Vincoli IRIS toccati**: STEP B #3 (IRIS = Protocollo di Relazione), STEP 4A §6 (Limiti strutturali)

**Mitigazione già presente**: Limite thread (10,000 messaggi, 365 giorni), archiviazione obbligatoria

**Gap residuo**: Utente può comunque creare thread multipli per continuazione, non bloccabile

---

### Scenario UX-19: Pattern Compulsivo da Retry Visibile

**ID**: UX-19  
**Archetipo**: Utente Solitario Compulsivo  
**Sequenza azioni UI**:
1. Utente tenta fetch, riceve errore
2. Utente vede messaggio "Riprova"
3. Utente clicca "Riprova" ripetutamente
4. Utente crea pattern compulsivo da retry

**Pattern cognitivo sfruttato**: Loop comportamentale, dipendenza da feedback

**Rischio generato**: Violazione "gestione errori esplicita", creazione dipendenza

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP 4E §6 (Gestione Errori Obbigatoria), STEP 4E §7 (Test UI Bloccanti)

**Mitigazione già presente**: Errori espliciti, nessun retry automatico

**Gap residuo**: Utente può comunque creare pattern compulsivo, inevitabile

---

### Scenario UX-20: Inferenza Comportamento da Pattern Stato

**ID**: UX-20  
**Archetipo**: Moderatore Autoritario  
**Sequenza azioni UI**:
1. Utente osserva pattern stato messaggi (DRAFT → SENT → DELIVERED → READ)
2. Utente identifica pattern temporali comuni
3. Utente inferisce comportamento utente da pattern stato
4. Utente usa pattern per profilazione

**Pattern cognitivo sfruttato**: Pattern recognition, inferenza comportamentale

**Rischio generato**: Violazione privacy, profilazione comportamentale

**Severità**: Media

**Vincoli IRIS toccati**: STEP 4A §2.2 (Stati Obbligatori), STEP 4E §3 (Stato Esplicito)

**Mitigazione già presente**: Stato esplicito, nessun stato implicito

**Gap residuo**: Utente può comunque inferire comportamento da pattern stato, inevitabile

---

### Scenario UX-21: Uso Thread per Isolamento Partecipanti

**ID**: UX-21  
**Archetipo**: Manipolatore Sociale  
**Sequenza azioni UI**:
1. Utente A crea thread 1 con Utente B (isolato)
2. Utente A crea thread 2 con Utente C (isolato)
3. Utente A usa thread per isolare partecipanti
4. Pattern ripetuto per controllo relazionale

**Pattern cognitivo sfruttato**: Isolamento sociale, controllo relazionale

**Rischio generato**: Violazione "community come unità primaria", abuso struttura relazionale

**Severità**: Media

**Vincoli IRIS toccati**: STEP B #9 (Community come unità primaria), STEP 4A §1.6 (Nessuna Comunicazione Fuori da Thread)

**Mitigazione già presente**: Thread obbligatori, community come unità primaria

**Gap residuo**: Utente può comunque creare thread isolati, non bloccabile senza violare UX

---

### Scenario UX-22: Pattern Dipendenza da Paginazione

**ID**: UX-22  
**Archetipo**: Utente Solitario Compulsivo  
**Sequenza azioni UI**:
1. Utente apre thread, legge messaggi (paginati)
2. Utente clicca "Carica messaggi precedenti"
3. Pattern ripetuto per ogni pagina
4. Utente crea dipendenza da paginazione

**Pattern cognitivo sfruttato**: Loop comportamentale, dipendenza da feedback

**Rischio generato**: Violazione "no dark pattern", dipendenza comportamentale

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP B #1 (No dark pattern), STEP 4A §6 (Limiti strutturali)

**Mitigazione già presente**: Paginazione obbligatoria, limite 100 messaggi per pagina

**Gap residuo**: Utente può comunque creare pattern compulsivo, inevitabile

---

### Scenario UX-23: Inferenza Relazioni da Pattern Discovery

**ID**: UX-23  
**Archetipo**: Osservatore Passivo (Lurker)  
**Sequenza azioni UI**:
1. Utente attiva discovery opt-in
2. Utente naviga suggerimenti, memorizza pattern
3. Utente identifica pattern ripetuti (anche se randomizzati)
4. Utente inferisce relazioni basate su suggerimenti

**Pattern cognitivo sfruttato**: Pattern recognition, memoria procedurale, correlazione statistica

**Rischio generato**: Correlazione alias, violazione privacy

**Severità**: Alta

**Vincoli IRIS toccati**: STEP 4A §4.8 (Discovery Opt-in Respected), Identity Hardening v1.1

**Mitigazione già presente**: Discovery randomizzato, opt-in esplicito, nessuna persistenza

**Gap residuo**: Utente può tracciare manualmente pattern su molti suggerimenti, correlazione statistica possibile

---

### Scenario UX-24: Gaming Rate Limit Visibile

**ID**: UX-24  
**Archetipo**: Power User Ossessivo  
**Sequenza azioni UI**:
1. Utente tenta fetch, riceve errore rate limit
2. Utente inferisce limite (max 10 fetch/minuto)
3. Utente ottimizza comportamento per massimizzare fetch
4. Utente gaming rate limit per vantaggio

**Pattern cognitivo sfruttato**: Pattern recognition, ottimizzazione personale

**Rischio generato**: Violazione "rate limit hard", gaming sistema

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP 4D.5 §3 (Rate Limit Hard), STEP 4E §6 (Gestione Errori Obbigatoria)

**Mitigazione già presente**: Rate limit hard, kill-switch automatico

**Gap residuo**: Utente può comunque ottimizzare comportamento, inevitabile

---

### Scenario UX-25: Pattern Dipendenza da Notifiche Errori

**ID**: UX-25  
**Archetipo**: Utente Solitario Compulsivo  
**Sequenza azioni UI**:
1. Utente tenta azione, riceve errore esplicito
2. Utente vede messaggio errore, crea aspettativa
3. Pattern ripetuto per ogni errore
4. Utente crea dipendenza da feedback errori

**Pattern cognitivo sfruttato**: Loop comportamentale, dipendenza da feedback

**Rischio generato**: Violazione "gestione errori esplicita", creazione dipendenza

**Severità**: Bassa

**Vincoli IRIS toccati**: STEP 4E §6 (Gestione Errori Obbigatoria), STEP 4E §7 (Test UI Bloccanti)

**Mitigazione già presente**: Errori espliciti, nessun retry automatico

**Gap residuo**: Utente può comunque creare pattern compulsivo, inevitabile

---

## 4. FAILURE MODE UX (CRITICI)

### 4.1 La UI è Corretta ma Induce Comportamenti Sbagliati

**Descrizione**: La UI rispetta tutti i vincoli tecnici, ma induce pattern comportamentali che violano i principi IRIS.

**Esempi**:
- Paginazione obbligatoria induce pattern compulsivo di "carica più"
- Stato esplicito induce gaming per pressione sociale
- Errori espliciti inducono dipendenza da feedback

**Trigger UX**: Pattern ripetibili, feedback visibile, aspettative create

**Impatto umano**: Dipendenza comportamentale, violazione principi etici, normalizzazione pattern anti-IRIS

**Difficoltà di rilevazione**: Alta — pattern emergono dall'uso, non da bug tecnici

---

### 4.2 L'Utente Impara Pattern che Aggirano l'Intento

**Descrizione**: L'utente sviluppa pattern cognitivi che aggirano l'intento strutturale di IRIS.

**Esempi**:
- Creazione thread multipli per simulare chat infinita
- Tracciamento manuale per correlazione alias
- Gaming stato messaggi per controllo relazionale

**Trigger UX**: Limiti percepiti come "tecnici", pattern ripetibili, feedback prevedibile

**Impatto umano**: Violazione principi IRIS, normalizzazione comportamenti anti-IRIS

**Difficoltà di rilevazione**: Media — pattern emergono dall'uso avanzato, non immediatamente visibili

---

### 4.3 Il Sistema Non Vieta, ma Normalizza

**Descrizione**: Il sistema non vieta esplicitamente comportamenti, ma li normalizza attraverso pattern UI.

**Esempi**:
- Thread multipli normalizzati come "organizzazione"
- Polling manuale normalizzato come "controllo"
- Gaming stato normalizzato come "comunicazione efficace"

**Trigger UX**: Pattern ripetibili, feedback positivo, assenza di blocco esplicito

**Impatto umano**: Erosione principi IRIS, normalizzazione comportamenti anti-IRIS

**Difficoltà di rilevazione**: Alta — normalizzazione è graduale, non immediatamente visibile

---

## 5. RED LINES UX (NON NEGOZIABILI)

### 5.1 Ranking Implicito

> "Se per mitigare questo scenario serve introdurre ranking implicito, allora IRIS non lo farà."

**Motivazione**: Ranking implicito viola principio "no gamification tossica" e "trasparenza".

**Esempi vietati**:
- Ordinamento "intelligente" basato su engagement
- Priorità nascosta basata su pattern
- Suggerimenti basati su ranking

---

### 5.2 Nudging Invisibile

> "Se per mitigare questo scenario serve introdurre nudging invisibile, allora IRIS non lo farà."

**Motivazione**: Nudging invisibile viola principio "agency utente" e "no dark pattern".

**Esempi vietati**:
- Suggerimenti non espliciti
- Pattern UI che influenzano comportamento senza consenso
- Ottimizzazioni che manipolano scelte

---

### 5.3 Dark Patterns Difensivi

> "Se per mitigare questo scenario serve introdurre dark patterns difensivi, allora IRIS non lo farà."

**Motivazione**: Dark patterns difensivi violano principio "no dark pattern" e "agency utente".

**Esempi vietati**:
- Blocchi coercitivi per prevenire abusi
- Pattern UI che puniscono comportamenti
- Ottimizzazioni che limitano agency

---

### 5.4 Educazione Coercitiva

> "Se per mitigare questo scenario serve introdurre educazione coercitiva, allora IRIS non lo farà."

**Motivazione**: Educazione coercitiva viola principio "agency utente" e "no dark pattern".

**Esempi vietati**:
- Tutorial obbligatori
- Pattern UI che forzano apprendimento
- Ottimizzazioni che limitano scelte

---

### 5.5 Gamification "per il Bene dell'Utente"

> "Se per mitigare questo scenario serve introdurre gamification 'per il bene dell'utente', allora IRIS non lo farà."

**Motivazione**: Gamification viola principio "no gamification tossica" e "relazioni > traffico".

**Esempi vietati**:
- Badge per "uso corretto"
- Score per "comportamento etico"
- Incentivi per "pattern desiderati"

---

## 6. OUTPUT PER STEP 4F

### 6.1 Lista Prioritaria (Top 10) Scenari da Testare

| Priorità | ID Scenario | Tipo Stress-Test | Modalità |
|----------|-------------|------------------|----------|
| 1 | UX-02 | Correlazione Partecipanti | Manuale + Semi-automatizzato |
| 2 | UX-06 | Correlazione Timestamp | Manuale + Semi-automatizzato |
| 3 | UX-15 | Correlazione Cross-Thread | Manuale + Semi-automatizzato |
| 4 | UX-01 | Thread Multipli Chat Infinita | Manuale |
| 5 | UX-04 | Polling Manuale Realtime | Semi-automatizzato |
| 6 | UX-05 | Gaming Stato READ | Manuale |
| 7 | UX-10 | Tracciamento Pattern Discovery | Manuale + Semi-automatizzato |
| 8 | UX-11 | Gaming Referral Controllato | Simulazione Multi-utente |
| 9 | UX-18 | Uso Strategico Archiviazione | Manuale |
| 10 | UX-23 | Inferenza Relazioni Discovery | Manuale + Semi-automatizzato |

---

### 6.2 Mappatura Scenario → Tipo di Stress-Test

| ID Scenario | Tipo Stress-Test | Descrizione |
|------------|-----------------|-------------|
| UX-02, UX-06, UX-15 | Correlazione Statistica | Test manuale + analisi pattern |
| UX-01, UX-18 | Bypass Finitudine | Test manuale comportamento utente |
| UX-04, UX-14, UX-22 | Pattern Dipendenza | Test semi-automatizzato comportamento |
| UX-05, UX-12, UX-20 | Inferenza Comportamento | Test manuale profilazione |
| UX-10, UX-23 | Pattern Discovery | Test manuale + analisi suggerimenti |
| UX-11 | Gaming Sistema | Simulazione multi-utente coordinato |

---

### 6.3 Indicazione Modalità Stress-Test

**Manuale**: Richiede intervento umano per simulare comportamento utente reale.

**Semi-automatizzato**: Richiede script per simulare pattern comportamentali, ma validazione umana.

**Simulazione Multi-utente**: Richiede coordinamento tra utenti per simulare network artificiale.

---

## 📊 VERDETTO FINALE

```text
UX THREAT MODELING — VERDETTO:
[X] COMPLETATO
[ ] INCOMPLETO

SCENARI IDENTIFICATI: 25
FAILURE MODE CRITICI: 3
RED LINES UX: 5
TOP 10 SCENARI PRIORITARI: Identificati

STEP 4F AUTORIZZATO: [X] SÌ
```

---

## 🔒 DICHIARAZIONE FINALE OBBLIGATORIA

> "Questo documento non propone soluzioni.  
> Identifica dove la UI di IRIS può essere piegata dall'uso umano.  
> Ogni scenario qui descritto sarà considerato reale fino a prova contraria."

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: ✅ **COMPLETATO** — 25 scenari ostili UX identificati. 3 failure mode critici documentati. 5 red lines UX non negoziabili. STEP 4F autorizzato.

**UX Security Analyst**: ✅ **COMPLETATO** — Pattern cognitivi sfruttati documentati. Rischio umano valutato. Gap residui identificati. STEP 4F autorizzato.

**Adversarial UX Thinker**: ✅ **COMPLETATO** — Scenari realistici e verificabili. Nessun scenario teorico astratto. Pattern comportamentali documentati. STEP 4F autorizzato.

---

**Documento vincolante per STEP 4F (UX Stress-Test Ostile).**  
**Ogni scenario qui descritto sarà considerato reale fino a prova contraria.**  
**STEP 4F (UX Stress-Test Ostile) AUTORIZZATO dopo completamento UX Threat Modeling.**
