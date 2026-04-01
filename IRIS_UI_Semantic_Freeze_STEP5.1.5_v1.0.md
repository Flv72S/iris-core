---
title: "IRIS — UI Semantic Freeze STEP 5.1.5 v1.0"
author: "Principal Engineer + UX Security Analyst + UX Architect"
version: "1.0"
date: "2026-01-24"
status: "VINCOLANTE — Gate STEP 5.2"
dependencies: "IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md, IRIS_UX_Threat_Modeling_STEP4E5_v1.0.md, IRIS_UX_StressTest_Ostile_STEP4F_v1.0.md, IRIS_UX_Hardening_STEP4G_v1.0.md"
tags: ["FASE2", "Messaging", "STEP5.1.5", "UI", "Semantic", "Freeze", "Gate"]
---

# IRIS — UI Semantic Freeze STEP 5.1.5 v1.0

> Congelamento del significato semantico della UI prima del collegamento a dati reali o mock.  
> **Stato**: VINCOLANTE — Gate STEP 5.2

---

## 🎯 DICHIARAZIONE DI FREEZE

**Il significato della UI è congelato prima di STEP 5.2.**

Questa dichiarazione è **normativa e vincolante**. Qualsiasi modifica al significato semantico della UI dopo questo freeze richiede:

1. Revisione di questo documento
2. Aggiornamento dei test semantici
3. Rivalutazione dei rischi UX
4. Autorizzazione esplicita

**STEP 5.2 (Collegamento Backend / Mock) NON può modificare il significato semantico della UI.**

---

## 📚 VOCABOLARIO UI CONGELATO

### Tabella: Termini e Significati

| Termine | Significato Consentito | Interpretazioni Vietate | Documento di Riferimento |
|---------|------------------------|--------------------------|--------------------------|
| **Paginazione** | Finestra finita e dichiarata di elementi. Limite esplicito e visibile. | Scroll infinito, caricamento automatico, continuità infinita | STEP 4E §2 (Finitudine visibile) |
| **Lista thread** | Insieme finito di thread. Ordinamento statico documentato. | Priorità implicita, ranking intelligente, ordinamento dinamico | STEP 4E §2.1 (Thread List View) |
| **Stato messaggio** | Stato tecnico esplicito (DRAFT / SENT / DELIVERED / READ / ARCHIVED / EXPIRED). | Stato emotivo, stato sociale, stato inferito | STEP 4E §3 (Stato esplicito) |
| **Nessun nuovo messaggio** | Stato del sistema: non ci sono messaggi nuovi nel thread. | Silenzio sociale, attesa performativa, urgenza implicita | STEP 4G §3.2 (Disinnesco interpretazione) |
| **Carica messaggi precedenti** | Azione esplicita dell'utente per caricare una finestra finita di messaggi precedenti. | Continuità infinita, preload automatico, suggerimento di urgenza | STEP 4E §2.2 (Thread Detail View) |
| **Fine lista thread** | Indicatore esplicito che la lista è finita. Nessun altro thread disponibile. | Continuità infinita, suggerimento di refresh | STEP 4E §2 (Finitudine visibile) |
| **Partecipanti** | Elenco alias partecipanti al thread. Ordine randomizzato (non persistente). | Ordine persistente, gerarchia sociale, importanza implicita | STEP 4D.5 §1 (Randomizzazione Partecipanti) |
| **Timestamp** | Timestamp arrotondato (bucket 5 secondi). Precisione privacy-first. | Timestamp ad alta risoluzione, correlazione temporale precisa | STEP 4D.5 §4 (Arrotondamento Timestamp) |
| **Thread aperto** | Stato tecnico del thread: OPEN. Condizione necessaria per inviare messaggi. | Urgenza, disponibilità sociale, attesa performativa | STEP 4E §2.4 (Composer) |
| **Errore** | Stato esplicito del sistema. Messaggio di errore dichiarativo. | Retry automatico, degradazione invisibile, suggerimento di azione | STEP 4E §6 (Gestione errori) |

---

## 🚫 CONCETTI UI VIETATI

### 1. Urgenza Implicita

**Definizione**: Qualsiasi suggerimento che un'azione debba essere compiuta rapidamente o che ci sia una scadenza temporale.

**Esempi vietati**:
- "Nuovi messaggi in arrivo"
- "Resta aggiornato"
- "Ultima attività"
- "In attesa..."
- "Non risponde da X tempo"

**Rischio mitigato**: UX-04 (Forzatura realtime percepito), UX-15 (Pattern temporali)

**Documento**: STEP 4E §4 (Assenza di realtime), STEP 4G §3.1 (Disinnesco interpretazione)

---

### 2. Continuità Infinita

**Definizione**: Qualsiasi suggerimento che ci sia sempre più contenuto disponibile o che il sistema sia infinito.

**Esempi vietati**:
- Scroll infinito
- Caricamento automatico
- "Altri messaggi disponibili" (senza limite esplicito)
- "Continua a leggere"

**Rischio mitigato**: UX-01 (Bypass finitudine percepita), UX-05 (Pattern dipendenza)

**Documento**: STEP 4E §2 (Finitudine visibile), STEP 4B §SB-010 (Chat infinita non primaria)

---

### 3. Priorità Invisibile

**Definizione**: Qualsiasi suggerimento che alcuni elementi siano più importanti di altri senza dichiarazione esplicita.

**Esempi vietati**:
- Ordinamento dinamico non dichiarato
- Evidenziazione implicita
- Ranking nascosto
- "Messaggi importanti"

**Rischio mitigato**: UX-03 (Inferenza priorità), UX-14 (Pattern controllo)

**Documento**: STEP 4E §2.1 (Nessun ranking intelligente), STEP 4G §2.1 (Comunicazione intento)

---

### 4. Attesa Performativa

**Definizione**: Qualsiasi suggerimento che l'utente debba attendere o che ci sia un'attesa in corso.

**Esempi vietati**:
- "In attesa di risposta"
- "L'altro utente sta scrivendo..."
- "Online / Offline"
- "Last seen"

**Rischio mitigato**: UX-04 (Forzatura realtime), UX-15 (Pattern temporali)

**Documento**: STEP 4E §4 (Assenza di realtime), STEP 4G §3.2 (Disinnesco interpretazione)

---

### 5. Importanza Sociale

**Definizione**: Qualsiasi suggerimento che alcuni utenti o thread siano socialmente più importanti.

**Esempi vietati**:
- "Persone che potresti conoscere"
- "Thread popolari"
- "Utenti attivi"
- Gerarchia sociale implicita

**Rischio mitigato**: UX-02 (Ricostruzione grafo sociale), UX-14 (Pattern controllo)

**Documento**: STEP 4E §5 (Privacy by UI), STEP 4G §2.1 (Comunicazione intento)

---

## 🗺 RELAZIONE CON UX THREAT MODELING

### Mappatura: Concetto UI → Scenario UX Mitigato

| Concetto UI | Scenario UX Mitigato | Archetipo Attaccante | Rischio Originale | Mitigazione |
|------------|----------------------|---------------------|-------------------|-------------|
| Paginazione finita | UX-01 (Bypass finitudine) | Power User Ossessivo | ALTO | Finitudine visibile |
| Stato messaggio esplicito | UX-06 (Gaming stato) | Manipolatore Sociale | MEDIO | Stato esplicito |
| Nessun realtime | UX-04 (Forzatura realtime) | Utente Solitario Compulsivo | ALTO | Assenza realtime |
| Partecipanti randomizzati | UX-02 (Ricostruzione grafo) | Moderatore Autoritario | CRITICO | Privacy by UI |
| Timestamp arrotondati | UX-07 (Correlazione temporale) | Power User Ossessivo | MEDIO | Privacy by UI |
| Errore esplicito | UX-08 (Abuse errori) | Power User Ossessivo | BASSO | Gestione errori esplicita |
| Thread obbligatorio | UX-09 (Gaming stato thread) | Manipolatore Sociale | MEDIO | Thread-first |
| Nessun ranking | UX-03 (Inferenza priorità) | Moderatore Autoritario | MEDIO | Nessun ranking intelligente |
| Copy dichiarativo | UX-15 (Pattern temporali) | Utente Solitario Compulsivo | ALTO | Disinnesco interpretazione |
| Limiti visibili | UX-10 (Pattern controllo) | Moderatore Autoritario | MEDIO | Finitudine visibile |

---

## 🔒 VINCOLI SEMANTICI NON NEGOZIABILI

1. **Ogni termine UI deve avere un significato univoco e dichiarato**
2. **Nessun termine può suggerire continuità infinita**
3. **Nessun termine può suggerire urgenza o attesa**
4. **Nessun termine può suggerire priorità o importanza sociale**
5. **Ogni termine deve essere tracciabile a un documento vincolante**

---

## 📋 ENFORCEMENT

### Test Semantici

I test semantici (`ui-semantic-guards.test.tsx`) verificano che:
- Nessun copy suggerisca continuità infinita
- Nessun copy suggerisca urgenza o attesa
- Nessun copy suggerisca ranking implicito
- Nessun copy suggerisca importanza sociale
- Tutti i limiti siano espliciti e visibili

### ESLint Rules

Le regole ESLint esistenti bloccano:
- Side effects tecnici
- Pattern vietati a livello di codice

### Code Review

Ogni PR che modifica la UI deve:
1. Verificare che non introduca nuovi significati semantici
2. Verificare che rispetti il vocabolario congelato
3. Verificare che non violi i concetti vietati

---

## ✍️ FIRME (SIMBOLICHE)

**Principal Engineer**: ✅ **UI SEMANTIC FREEZE CONFERMATO** — Il significato della UI è congelato. STEP 5.2 può procedere solo con collegamento meccanico a dati, senza modifiche semantiche.

**UX Security Analyst**: ✅ **UI SEMANTIC FREEZE CONFERMATO** — Vocabolario congelato, concetti vietati dichiarati, rischi mappati. STEP 5.2 autorizzato solo se meccanico.

---

**Documento vincolante per autorizzazione STEP 5.2.**  
**STEP 5.2 (Collegamento Backend / Mock) AUTORIZZATO solo se meccanico, senza modifiche semantiche.**
