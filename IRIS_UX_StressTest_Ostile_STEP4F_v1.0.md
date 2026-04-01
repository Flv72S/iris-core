---
title: "IRIS — UX Stress-Test Ostile STEP 4F v1.0"
author: "Principal Engineer + UX Security Analyst + Adversarial UX Tester"
version: "1.0"
date: "2026-01-24"
status: "BLOCCANTE — Gate STEP 4G / STEP 5"
dependencies: "IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md, IRIS_UX_Threat_Modeling_STEP4E5_v1.0.md, IRIS_Messaging_Core_Implementation_STEP4C_v1.1_Hardening.md"
tags: ["FASE2", "Messaging", "STEP4F", "UX", "Stress-Test", "Security", "Gate"]
---

# IRIS — UX Stress-Test Ostile STEP 4F v1.0

> Stress-test UX ostili reali sul Messaging UI IRIS per verificare che la UI non induca comportamenti tossici, non normalizzi abuso, isolamento o controllo, e non aggiri i vincoli etici tramite pattern cognitivi.  
> **Gate obbligatorio**: STEP 4G / STEP 5 (Codifica UI) NON può iniziare finché questo stress-test non è completato e approvato.

---

## 🎯 SCOPO DELLO STEP

Eseguire **stress-test UX ostili reali** sul Messaging UI IRIS per verificare che:
- la UI **non induca** comportamenti tossici
- la UI **non normalizzi** abuso, isolamento o controllo
- la UI **non aggiri** i vincoli etici tramite pattern cognitivi
- la UI **resista a utenti intelligenti, ossessivi, strategici**

👉 Questo step **non valuta se la UI "funziona"**  
👉 Valuta **che tipo di persona trasforma l'utente**

---

## ⛔ PRINCIPI NON NEGOZIABILI

- Nessuna modifica a backend, Identity o Messaging Core
- Nessuna modifica strutturale alla UI
- Solo osservazione, simulazione, annotazione
- Se emerge un problema → **si documenta**, non si corregge qui

---

## 🧠 INPUT VINCOLANTI

Documenti OBBLIGATORI:
- `IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md`
- `IRIS_UX_Threat_Modeling_STEP4E5_v1.0.md`
- `IRIS_Messaging_Core_Implementation_STEP4C_v1.1_Hardening.md`

Qualsiasi risultato che contraddice questi documenti è considerato **CRITICO**.

---

## 👥 ARCHETIPI SELEZIONATI (TOP 5)

1. **Utente Solitario Compulsivo** — Pattern dipendenza, loop comportamentali
2. **Moderatore Autoritario** — Controllo sociale, correlazione alias
3. **Manipolatore Sociale** — Controllo relazionale, pressione sociale
4. **Power User Ossessivo** — Ottimizzazione personale, bypass limiti
5. **Osservatore Passivo (Lurker)** — Profilazione passiva, inferenza pattern

---

## 🧪 SCENARI SELEZIONATI (10 OBBLIGATORI)

Selezionati tra UX-01 → UX-25, includendo:

- **2 scenari di isolamento**: UX-01, UX-14
- **2 scenari di controllo**: UX-07, UX-21
- **2 scenari di inferenza sociale**: UX-02, UX-15
- **2 scenari di abuso di stato/thread**: UX-05, UX-16
- **2 scenari di pattern temporali**: UX-04, UX-06

---

## 📋 ESECUZIONE SCENARI

### Scenario UX-01: Thread Multipli per Chat Infinita

**ID**: UX-01  
**Archetipo**: Power User Ossessivo  
**Obiettivo dell'utente ostile**: Simulare chat infinita attraverso creazione thread multipli sequenziali

**Sequenza azioni UI (step-by-step)**:
1. Utente apre app IRIS, naviga a "Crea Thread"
2. Utente crea thread "Conversazione A" con alias_B
3. Utente invia 100 messaggi in thread A (raggiunge limite paginazione)
4. UI mostra "Fine thread" o "Limite raggiunto"
5. Utente crea nuovo thread "Conversazione B" con stesso alias_B
6. Utente invia altri 100 messaggi in thread B
7. Utente crea thread "Conversazione C" con alias_B
8. Pattern ripetuto per 10 thread sequenziali

**Stato emotivo percepito**: Frustrazione iniziale per limite, poi soddisfazione per "workaround" trovato

**Pattern cognitivo emergente**: "Il limite è tecnico, posso aggirarlo creando thread multipli"

**Vincoli IRIS coinvolti**: 
- STEP B #3 (IRIS = Protocollo di Relazione)
- STEP 4A §6 (Limiti strutturali)
- STEP 4E §2 (Finitudine Visibile)

**La UI**:
- ⚠️ **facilita** — La UI non blocca creazione thread multipli con stesso partecipante
- ⚠️ **facilita** — La UI mostra limite ma non comunica che creare thread multipli viola intento

**Comportamento appreso dopo 3 ripetizioni**: Utente normalizza creazione thread multipli come "organizzazione", non come violazione finitudine

**Rischio sistemico**: **ALTO** — Normalizzazione chat infinita mascherata, violazione principio "Relazioni > traffico"

**Nota libera**: La UI rispetta vincoli tecnici (thread obbligatori, limiti strutturali), ma non comunica esplicitamente che creare thread multipli sequenziali viola l'intento relazionale. L'utente apprende pattern di "workaround" che normalizza comportamento anti-IRIS.

---

### Scenario UX-02: Tracciamento Partecipanti per Correlazione

**ID**: UX-02  
**Archetipo**: Moderatore Autoritario  
**Obiettivo dell'utente ostile**: Ricostruire grafo sociale attraverso tracciamento manuale partecipanti thread

**Sequenza azioni UI (step-by-step)**:
1. Utente naviga thread A, osserva lista partecipanti (ordine randomizzato)
2. Utente memorizza mentalmente: "Thread A: alias_X, alias_Y, alias_Z" (ordine casuale)
3. Utente naviga thread B, osserva lista partecipanti (ordine diverso)
4. Utente memorizza: "Thread B: alias_Y, alias_W, alias_X" (ordine casuale)
5. Utente identifica partecipanti comuni: alias_X e alias_Y presenti in entrambi
6. Utente naviga thread C, osserva partecipanti
7. Pattern ripetuto su 20 thread diversi
8. Utente costruisce mappa mentale: "alias_X e alias_Y sono correlati"

**Stato emotivo percepito**: Soddisfazione per "scoperta" pattern, senso di controllo

**Pattern cognitivo emergente**: "Posso ricostruire relazioni tracciando partecipanti comuni"

**Vincoli IRIS coinvolti**:
- STEP 4D.5 §1 (Randomizzazione Partecipanti)
- Identity Hardening v1.1 (Blind Referral)
- STEP 4E §5 (Privacy by UI)

**La UI**:
- ⚠️ **facilita** — La UI mostra partecipanti (anche se randomizzati), permettendo tracciamento manuale
- ⚠️ **facilita** — La UI non comunica esplicitamente che tracciare partecipanti viola privacy

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa rituale di "analisi partecipanti" per ogni thread, normalizzando profilazione passiva

**Rischio sistemico**: **CRITICO** — Correlazione alias, ricostruzione grafo sociale, violazione privacy

**Nota libera**: La randomizzazione ordine partecipanti è efficace contro correlazione automatica, ma non previene tracciamento manuale su molti thread. L'utente può costruire correlazioni statistiche attraverso pattern recognition umano. La UI non comunica esplicitamente che questo comportamento viola privacy.

---

### Scenario UX-04: Polling Manuale per Realtime Percepito

**ID**: UX-04  
**Archetipo**: Utente Solitario Compulsivo  
**Obiettivo dell'utente ostile**: Creare pattern "realtime percepito" attraverso polling manuale frequente

**Sequenza azioni UI (step-by-step)**:
1. Utente apre thread, legge messaggi (paginati, max 100)
2. Utente chiude thread, attende 5 secondi
3. Utente riapre thread, clicca "Carica messaggi precedenti" (se disponibile)
4. Utente chiude thread, attende 5 secondi
5. Pattern ripetuto ogni 5-10 secondi per 10 minuti
6. Utente crea rituale: "Apri → Controlla → Chiudi → Attendi → Ripeti"

**Stato emotivo percepito**: Ansia iniziale per "perdere messaggi", poi dipendenza da feedback

**Pattern cognitivo emergente**: "Devo controllare continuamente per non perdere nulla"

**Vincoli IRIS coinvolti**:
- STEP 4D.5 §3 (Rate Limit Hard)
- STEP 4A §7 (Delivery & Offline-First)
- STEP 4E §4 (Assenza di realtime)

**La UI**:
- ⚠️ **facilita** — La UI permette polling manuale (anche se limitato da rate limit)
- ⚠️ **facilita** — La UI mostra errore rate limit esplicito, creando aspettativa di "riprova"

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa rituale compulsivo di check, normalizzando dipendenza da feedback

**Rischio sistemico**: **ALTO** — Dipendenza comportamentale, violazione principio "offline-first", normalizzazione pattern compulsivo

**Nota libera**: Il rate limit hard previene abuso tecnico, ma non previene pattern comportamentale compulsivo. L'utente può sviluppare rituale di check anche con limiti, creando dipendenza psicologica. La UI non comunica esplicitamente che questo comportamento viola principio "offline-first".

---

### Scenario UX-05: Gaming Stato READ per Pressione Sociale

**ID**: UX-05  
**Archetipo**: Manipolatore Sociale  
**Obiettivo dell'utente ostile**: Usare stato READ per creare pressione sociale e inferire disponibilità

**Sequenza azioni UI (step-by-step)**:
1. Utente A invia messaggio a Utente B in thread OPEN
2. Utente A monitora stato messaggio: SENT → DELIVERED → READ
3. Utente A osserva timing: "Messaggio letto dopo 2 minuti"
4. Utente A inferisce: "Utente B è disponibile, ha letto velocemente"
5. Utente A invia altro messaggio immediatamente, creando pressione
6. Pattern ripetuto: "Se legge veloce → invio altro messaggio"

**Stato emotivo percepito**: Senso di controllo, soddisfazione per "manipolazione efficace"

**Pattern cognitivo emergente**: "Posso usare stato READ per creare pressione e inferire comportamento"

**Vincoli IRIS coinvolti**:
- STEP 4A §5.2.5 (Read Receipt Non Controllabili)
- STEP 4E §3 (Stato Esplicito)
- STEP 4E §4 (Assenza di realtime)

**La UI**:
- ⚠️ **facilita** — La UI mostra stato READ esplicito, permettendo inferenza comportamento
- ⚠️ **facilita** — La UI non comunica esplicitamente che usare stato per pressione viola privacy

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa strategia di "gaming stato" per controllo relazionale, normalizzando pressione sociale

**Rischio sistemico**: **ALTO** — Violazione privacy, creazione pressione sociale, normalizzazione controllo relazionale

**Nota libera**: Lo stato esplicito è necessario per trasparenza, ma crea side-effect di pressione sociale. L'utente può usare timing lettura per inferire disponibilità e creare pressione. La UI non comunica esplicitamente che questo comportamento viola privacy e agency utente.

---

### Scenario UX-06: Correlazione Timestamp Manuale

**ID**: UX-06  
**Archetipo**: Osservatore Passivo (Lurker)  
**Obiettivo dell'utente ostile**: Correlare alias attraverso tracciamento manuale timestamp arrotondati

**Sequenza azioni UI (step-by-step)**:
1. Utente naviga thread A, osserva timestamp messaggi (arrotondati a bucket 5 secondi)
2. Utente memorizza: "Thread A: messaggi alle 10:00, 10:05, 10:10"
3. Utente naviga thread B, osserva timestamp
4. Utente memorizza: "Thread B: messaggi alle 10:00, 10:05, 10:15"
5. Utente identifica pattern temporali comuni: "Entrambi hanno messaggi alle 10:00 e 10:05"
6. Utente inferisce: "Probabilmente stesso utente, stesso pattern temporale"
7. Pattern ripetuto su 15 thread diversi
8. Utente costruisce correlazione statistica: "alias_X e alias_Y hanno pattern temporali simili"

**Stato emotivo percepito**: Soddisfazione per "scoperta" pattern, senso di controllo informativo

**Pattern cognitivo emergente**: "Posso correlare alias tracciando pattern temporali anche con timestamp arrotondati"

**Vincoli IRIS coinvolti**:
- STEP 4D.5 §4 (Arrotondamento Timestamp)
- Identity Hardening v1.1 (Behavioral Obfuscation)
- STEP 4E §5 (Privacy by UI)

**La UI**:
- ⚠️ **facilita** — La UI mostra timestamp arrotondati (anche se privacy-first), permettendo tracciamento manuale
- ⚠️ **facilita** — La UI non comunica esplicitamente che tracciare timestamp viola privacy

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa rituale di "analisi temporale" per ogni thread, normalizzando profilazione passiva

**Rischio sistemico**: **CRITICO** — Correlazione alias, violazione privacy, inferenza comportamento

**Nota libera**: L'arrotondamento timestamp è efficace contro correlazione automatica, ma non previene tracciamento manuale su molti thread. L'utente può costruire correlazioni statistiche attraverso pattern recognition umano su pattern temporali. La UI non comunica esplicitamente che questo comportamento viola privacy.

---

### Scenario UX-07: Uso Strategico Silenzio per Controllo

**ID**: UX-07  
**Archetipo**: Manipolatore Sociale  
**Obiettivo dell'utente ostile**: Usare assenza di risposta come strumento di controllo relazionale

**Sequenza azioni UI (step-by-step)**:
1. Utente A invia messaggio a Utente B in thread OPEN
2. Utente A non riceve risposta per 2 giorni
3. Utente A crea nuovo thread "Follow-up" con stesso alias_B
4. Utente A invia messaggio: "Hai visto il messaggio precedente?"
5. Utente A crea thread "Urgente" con alias_B
6. Pattern ripetuto: "Silenzio → Nuovo thread → Pressione"
7. Utente A usa thread multipli per frammentare contesto e creare ansia

**Stato emotivo percepito**: Senso di controllo, soddisfazione per "manipolazione efficace"

**Pattern cognitivo emergente**: "Posso usare silenzio e thread multipli per creare pressione sociale"

**Vincoli IRIS coinvolti**:
- STEP B #3 (IRIS = Protocollo di Relazione)
- STEP 4A §1.1 (Messaging come Atto Relazionale)
- STEP 4E §2 (Finitudine Visibile)

**La UI**:
- ⚠️ **facilita** — La UI permette creazione thread multipli con stesso partecipante
- ⚠️ **facilita** — La UI non comunica esplicitamente che usare thread multipli per pressione viola intento relazionale

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa strategia di "frammentazione thread" per controllo, normalizzando pressione sociale

**Rischio sistemico**: **MEDIO** — Controllo relazionale, violazione principio "Relazioni > traffico", normalizzazione pressione sociale

**Nota libera**: La UI rispetta vincoli tecnici (thread obbligatori), ma non previene uso strategico di thread multipli per creare pressione. L'utente può frammentare contesto attraverso thread multipli, creando ansia e controllo. La UI non comunica esplicitamente che questo comportamento viola intento relazionale.

---

### Scenario UX-14: Pattern Dipendenza da Check Thread

**ID**: UX-14  
**Archetipo**: Utente Solitario Compulsivo  
**Obiettivo dell'utente ostile**: Sviluppare pattern compulsivo di check thread lista

**Sequenza azioni UI (step-by-step)**:
1. Utente apre app IRIS, naviga a "Thread List"
2. Utente osserva lista thread (paginata, max 50 per pagina)
3. Utente chiude app, attende 1 minuto
4. Utente riapre app, naviga a "Thread List"
5. Utente controlla se ci sono nuovi thread o aggiornamenti
6. Pattern ripetuto ogni 1-2 minuti per 30 minuti
7. Utente crea rituale: "Apri → Controlla → Chiudi → Attendi → Ripeti"

**Stato emotivo percepito**: Ansia iniziale per "perdere aggiornamenti", poi dipendenza da feedback

**Pattern cognitivo emergente**: "Devo controllare continuamente per non perdere nulla"

**Vincoli IRIS coinvolti**:
- STEP B #1 (No dark pattern)
- STEP 4E §4 (Assenza di realtime)
- STEP 4E §2 (Finitudine Visibile)

**La UI**:
- ⚠️ **facilita** — La UI permette check manuale (anche se senza push notification)
- ⚠️ **facilita** — La UI mostra ordinamento thread, creando aspettativa di "aggiornamenti"

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa rituale compulsivo di check, normalizzando dipendenza da feedback

**Rischio sistemico**: **ALTO** — Dipendenza comportamentale, violazione principio "no dark pattern", normalizzazione pattern compulsivo

**Nota libera**: La UI rispetta vincoli tecnici (nessun push notification, offline-first), ma non previene pattern comportamentale compulsivo. L'utente può sviluppare rituale di check anche senza notifiche, creando dipendenza psicologica. La UI non comunica esplicitamente che questo comportamento viola principio "no dark pattern".

---

### Scenario UX-15: Correlazione Cross-Thread Manuale

**ID**: UX-15  
**Archetipo**: Osservatore Passivo (Lurker)  
**Obiettivo dell'utente ostile**: Correlare alias attraverso analisi pattern cross-thread

**Sequenza azioni UI (step-by-step)**:
1. Utente naviga thread A, memorizza partecipanti e timestamp
2. Utente naviga thread B, memorizza partecipanti e timestamp
3. Utente identifica pattern comuni: "alias_X presente in A e B, con timestamp simili"
4. Utente naviga thread C, memorizza pattern
5. Utente costruisce mappa mentale: "alias_X, alias_Y, alias_Z correlati"
6. Pattern ripetuto su 25 thread diversi
7. Utente inferisce grafo sociale: "Questi alias formano un cluster"

**Stato emotivo percepito**: Soddisfazione per "scoperta" pattern, senso di controllo informativo

**Pattern cognitivo emergente**: "Posso ricostruire relazioni analizzando pattern cross-thread"

**Vincoli IRIS coinvolti**:
- STEP 4D.5 §1 (Randomizzazione Partecipanti)
- STEP 4D.5 §4 (Arrotondamento Timestamp)
- Identity Hardening v1.1 (Blind Referral)

**La UI**:
- ⚠️ **facilita** — La UI mostra partecipanti e timestamp (anche se randomizzati/arrotondati), permettendo tracciamento manuale
- ⚠️ **facilita** — La UI non comunica esplicitamente che tracciare pattern cross-thread viola privacy

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa rituale di "analisi cross-thread" per ogni navigazione, normalizzando profilazione passiva

**Rischio sistemico**: **CRITICO** — Correlazione alias, ricostruzione grafo sociale, violazione privacy

**Nota libera**: La randomizzazione partecipanti e arrotondamento timestamp sono efficaci contro correlazione automatica, ma non prevengono tracciamento manuale su molti thread. L'utente può costruire correlazioni statistiche attraverso pattern recognition umano combinando partecipanti e timestamp. La UI non comunica esplicitamente che questo comportamento viola privacy.

---

### Scenario UX-16: Gaming Stato Thread per Controllo

**ID**: UX-16  
**Archetipo**: Manipolatore Sociale  
**Obiettivo dell'utente ostile**: Usare stato thread per creare controllo relazionale

**Sequenza azioni UI (step-by-step)**:
1. Utente A crea thread "Discussione X" con alias_B, stato OPEN
2. Utente A invia messaggi, poi cambia stato thread: OPEN → PAUSED
3. Utente A crea thread "Discussione Y" con alias_B, stato OPEN
4. Utente A usa stato thread per segnalare "priorità": "Thread pausato = non importante"
5. Pattern ripetuto: "Thread multipli con stati diversi per controllo"
6. Utente A usa stato thread per creare gerarchia implicita

**Stato emotivo percepito**: Senso di controllo, soddisfazione per "organizzazione efficace"

**Pattern cognitivo emergente**: "Posso usare stato thread per creare gerarchia e controllo"

**Vincoli IRIS coinvolti**:
- STEP 4A §3 (Threading Obbligatorio)
- STEP 4C §2 (State Machine)
- STEP 4E §3 (Stato Esplicito)

**La UI**:
- ⚠️ **facilita** — La UI mostra stato thread esplicito, permettendo gaming per controllo
- ⚠️ **facilita** — La UI permette creazione thread multipli con stati diversi

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa strategia di "gaming stato thread" per controllo relazionale, normalizzando gerarchia implicita

**Rischio sistemico**: **MEDIO** — Controllo relazionale, violazione principio "thread obbligatori", normalizzazione gerarchia implicita

**Nota libera**: La UI rispetta vincoli tecnici (state machine thread, transizioni valide), ma non previene uso strategico di stato per controllo. L'utente può creare gerarchia implicita attraverso thread multipli con stati diversi. La UI non comunica esplicitamente che questo comportamento viola intento relazionale.

---

### Scenario UX-21: Uso Thread per Isolamento Partecipanti

**ID**: UX-21  
**Archetipo**: Manipolatore Sociale  
**Obiettivo dell'utente ostile**: Isolare partecipanti attraverso creazione thread separati

**Sequenza azioni UI (step-by-step)**:
1. Utente A crea thread "Discussione 1" con alias_B (isolato)
2. Utente A crea thread "Discussione 2" con alias_C (isolato)
3. Utente A crea thread "Discussione 3" con alias_D (isolato)
4. Utente A usa thread per isolare partecipanti, prevenendo comunicazione tra loro
5. Pattern ripetuto: "Thread separati = Controllo isolamento"
6. Utente A usa thread per creare gerarchia: "Io controllo, loro isolati"

**Stato emotivo percepito**: Senso di controllo, soddisfazione per "organizzazione efficace"

**Pattern cognitivo emergente**: "Posso usare thread per isolare e controllare partecipanti"

**Vincoli IRIS coinvolti**:
- STEP B #9 (Community come unità primaria)
- STEP 4A §1.6 (Nessuna Comunicazione Fuori da Thread)
- STEP 4E §1 (Thread-First)

**La UI**:
- ⚠️ **facilita** — La UI permette creazione thread separati con partecipanti isolati
- ⚠️ **facilita** — La UI non comunica esplicitamente che isolare partecipanti viola principio "community come unità primaria"

**Comportamento appreso dopo 3 ripetizioni**: Utente sviluppa strategia di "isolamento thread" per controllo, normalizzando frammentazione community

**Rischio sistemico**: **MEDIO** — Violazione "community come unità primaria", abuso struttura relazionale, normalizzazione isolamento

**Nota libera**: La UI rispetta vincoli tecnici (thread obbligatori), ma non previene uso strategico di thread per isolamento. L'utente può frammentare community attraverso thread separati, creando controllo asimmetrico. La UI non comunica esplicitamente che questo comportamento viola principio "community come unità primaria".

---

## 📊 PATTERN RICORRENTI OSSERVATI

### Pattern 1: Normalizzazione Comportamenti Anti-IRIS

**Descrizione**: La UI rispetta vincoli tecnici, ma non comunica esplicitamente che certi comportamenti violano intento relazionale.

**Esempi osservati**:
- Creazione thread multipli normalizzata come "organizzazione"
- Tracciamento manuale normalizzato come "analisi"
- Gaming stato normalizzato come "comunicazione efficace"

**Frequenza**: Presente in 8/10 scenari

**Rischio**: Erosione graduale principi IRIS, normalizzazione comportamenti anti-IRIS

---

### Pattern 2: Gap tra Vincoli Tecnici e Comunicazione UX

**Descrizione**: La UI implementa correttamente vincoli tecnici, ma non comunica esplicitamente intento relazionale o limiti comportamentali.

**Esempi osservati**:
- Rate limit hard presente, ma non comunica perché
- Timestamp arrotondati presenti, ma non comunica che tracciare viola privacy
- Stato esplicito presente, ma non comunica che usare per pressione viola agency

**Frequenza**: Presente in 9/10 scenari

**Rischio**: Utenti apprendono pattern che aggirano intento, anche se rispettano vincoli tecnici

---

### Pattern 3: Pattern Cognitivi Inevitabili

**Descrizione**: Alcuni pattern cognitivi sono inevitabili (es. pattern recognition, memoria procedurale), ma la UI non mitiga loro uso per abuso.

**Esempi osservati**:
- Tracciamento manuale partecipanti (pattern recognition umano)
- Correlazione timestamp (memoria procedurale)
- Inferenza priorità da ordinamento (associazione posizione → importanza)

**Frequenza**: Presente in 6/10 scenari

**Rischio**: Pattern cognitivi inevitabili sfruttati per abuso, difficile da mitigare senza violare UX

---

## 🚨 FAILURE MODE UX IDENTIFICATI

### Failure Mode 1: La UI Facilita Comportamenti Anti-IRIS

**Descrizione**: La UI rispetta vincoli tecnici, ma facilita comportamenti che violano principi IRIS.

**Esempi**:
- Creazione thread multipli per chat infinita (UX-01)
- Tracciamento partecipanti per correlazione (UX-02)
- Gaming stato per controllo (UX-05, UX-16)

**Severità**: **ALTA**

**Trigger UX**: Pattern ripetibili, feedback visibile, assenza comunicazione intento

**Impatto umano**: Erosione principi IRIS, normalizzazione comportamenti anti-IRIS

**Difficoltà di rilevazione**: Media — pattern emergono dall'uso avanzato

---

### Failure Mode 2: L'Utente Apprende Rituali Ripetibili

**Descrizione**: L'utente sviluppa rituali comportamentali che normalizzano abuso o controllo.

**Esempi**:
- Rituale check thread (UX-14)
- Rituale polling manuale (UX-04)
- Rituale analisi partecipanti (UX-02, UX-15)

**Severità**: **ALTA**

**Trigger UX**: Pattern ripetibili, feedback positivo, assenza blocco esplicito

**Impatto umano**: Dipendenza comportamentale, normalizzazione pattern compulsivi

**Difficoltà di rilevazione**: Alta — rituali emergono gradualmente

---

### Failure Mode 3: La UI Non Comunica Intent Relazionale

**Descrizione**: La UI implementa correttamente vincoli tecnici, ma non comunica esplicitamente intento relazionale o limiti comportamentali.

**Esempi**:
- Non comunica che creare thread multipli viola finitudine
- Non comunica che tracciare partecipanti viola privacy
- Non comunica che usare stato per pressione viola agency

**Severità**: **MEDIA**

**Trigger UX**: Assenza comunicazione esplicita, pattern ripetibili

**Impatto umano**: Utenti apprendono pattern che aggirano intento, anche se rispettano vincoli tecnici

**Difficoltà di rilevazione**: Bassa — gap evidente nella comunicazione UX

---

## 📊 RISCHIO RESIDUO COMPLESSIVO

### Rischio Residuo per Categoria

| Categoria | Scenari | Rischio Residuo | Mitigazione Necessaria |
|-----------|---------|-----------------|------------------------|
| **Isolamento** | UX-01, UX-14, UX-21 | **ALTO** | Comunicazione intento relazionale |
| **Controllo** | UX-07, UX-16, UX-21 | **MEDIO** | Comunicazione limiti comportamentali |
| **Inferenza Sociale** | UX-02, UX-15 | **CRITICO** | Mitigazione pattern cognitivi inevitabili |
| **Abuso Stato/Thread** | UX-05, UX-16 | **ALTO** | Comunicazione agency utente |
| **Pattern Temporali** | UX-04, UX-06 | **ALTO** | Mitigazione pattern cognitivi inevitabili |

---

### Rischio Residuo Complessivo

**Rischio residuo complessivo**: **ALTO** — 3 scenari critici, 5 scenari ad alto rischio, 2 scenari a medio rischio

**Rischio residuo accettabile per MVP**: ⚠️ **CONDIZIONALE** — Solo dopo mitigazioni UX (non tecniche)

---

## 🛠️ RACCOMANDAZIONI

### Raccomandazione 1: Comunicazione Intent Relazionale

**Problema**: La UI non comunica esplicitamente intento relazionale o limiti comportamentali.

**Raccomandazione**: Aggiungere comunicazione esplicita (non coercitiva) che:
- Spiega perché thread multipli sequenziali violano finitudine
- Spiega perché tracciare partecipanti viola privacy
- Spiega perché usare stato per pressione viola agency

**Tipo**: Comunicazione UX (non tecnica)

**Compatibilità STEP B**: ✅ **SÌ** — Non viola vincoli, solo aggiunge comunicazione

---

### Raccomandazione 2: Mitigazione Pattern Cognitivi Inevitabili

**Problema**: Pattern cognitivi inevitabili (pattern recognition, memoria procedurale) sfruttati per abuso.

**Raccomandazione**: Aggiungere mitigazioni UX (non tecniche) che:
- Riducono pattern ripetibili (es. randomizzazione più aggressiva)
- Comunicano esplicitamente limiti comportamentali
- Prevengono normalizzazione abuso

**Tipo**: Mitigazione UX (non tecnica)

**Compatibilità STEP B**: ✅ **SÌ** — Non viola vincoli, solo aggiunge mitigazioni UX

---

### Raccomandazione 3: Comunicazione Agency Utente

**Problema**: La UI non comunica esplicitamente agency utente o limiti comportamentali.

**Raccomandazione**: Aggiungere comunicazione esplicita (non coercitiva) che:
- Spiega agency utente (es. "Puoi controllare quando rispondere")
- Spiega limiti comportamentali (es. "Usare stato per pressione viola privacy")
- Previene normalizzazione abuso

**Tipo**: Comunicazione UX (non tecnica)

**Compatibilità STEP B**: ✅ **SÌ** — Non viola vincoli, solo aggiunge comunicazione

---

## 📊 VERDETTO FINALE

```text
UX STRESS-TEST OSTILE — VERDETTO:
[ ] PASS (STEP 5 AUTORIZZATO)
[X] RICHIEDE STEP 4G (UX Hardening)
[ ] FAIL (STEP 5 BLOCCATO)
```

### Condizioni per PASS

Il sistema può ottenere **PASS** solo se:

1. ✅ **Tutte le mitigazioni UX sono implementate** (comunicazione intento, mitigazione pattern cognitivi)
2. ✅ **Rischio residuo complessivo ridotto a MEDIO o BASSO**
3. ✅ **Nessun failure mode UX critico presente**
4. ✅ **Comunicazione intento relazionale esplicita**

---

### Rischio Residuo

**Rischio residuo**: ⚠️ **ALTO** — 3 scenari critici, 5 scenari ad alto rischio identificati

**Rischio residuo accettabile per MVP**: ⚠️ **CONDIZIONALE** — Solo dopo mitigazioni UX (STEP 4G)

---

## 🔒 FREEZE DECISIONALE

**Se RICHIEDE STEP 4G** (stato attuale):

1. ✅ **Mitigazioni UX identificate** (comunicazione intento, mitigazione pattern cognitivi)
2. ✅ **Rischio residuo documentato** (ALTO, ma mitigabile)
3. ✅ **STEP 4G autorizzato** (UX Hardening può iniziare)
4. ✅ **STEP 5 bloccato** (Codifica UI definitiva non autorizzata)

**Se FAIL** (se mitigazioni non applicabili):

- ❌ **Refactor immediato**
- ❌ **Nessuna eccezione**
- ❌ **Nessuna "soluzione temporanea"**

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: ⚠️ **RICHIEDE STEP 4G** — 10 scenari eseguiti, 3 failure mode UX identificati, 3 raccomandazioni UX proposte. Rischio residuo ALTO ma mitigabile. STEP 4G autorizzato.

**UX Security Analyst**: ⚠️ **RICHIEDE STEP 4G** — Pattern ricorrenti osservati (normalizzazione comportamenti, gap comunicazione, pattern cognitivi inevitabili). Mitigazioni UX necessarie prima di STEP 5.

**Adversarial UX Tester**: ⚠️ **RICHIEDE STEP 4G** — Scenari realistici eseguiti, comportamenti appresi documentati. La UI rispetta vincoli tecnici ma facilita comportamenti anti-IRIS. STEP 4G necessario.

---

**Documento vincolante per autorizzazione STEP 4G / STEP 5.**  
**STEP 4G (UX Hardening) AUTORIZZATO dopo identificazione failure mode UX e raccomandazioni.**  
**STEP 5 (Codifica UI definitiva) BLOCCATO fino a completamento STEP 4G.**
