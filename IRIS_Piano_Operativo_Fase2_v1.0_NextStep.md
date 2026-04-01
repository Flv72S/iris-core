---
title: "IRIS — Piano Operativo FASE 2 v1.0 (Next Step da FASE 1)"
author: "Team IRIS / Principal Engineer"
version: "1.0"
date: "2026-01-24"
tags: ["FASE2", "Identity", "Workflow", "Precompilato", "Cursor-ready"]
---

# IRIS — Piano Operativo FASE 2 v1.0 (Next Step da FASE 1)

> Documento operativo completo per FASE 2, collegato a FASE 1.  
> Tutte le tabelle, template, KPI e workflow sono precompilati.  
> Approccio operativo, etico e decentralizzato.

---

## 1. Collegamento con FASE 1

- **Vincoli STEP B FASE 1 ereditati**: Tutti i vincoli della FASE 1 rimangono **non negoziabili** per la FASE 2.
- **KPI baseline FASE 1**: Engagement 65–75%, Retention 60–70%, Conformita STEP B 95% rimangono **baseline di riferimento**.
- **Template Audit Ostile ed Early Adopter**: Adattati ai nuovi microstep FASE 2:
  - Account personale Iris
  - Profili con pseudonimi
  - Alias dinamici
  - Multi-community
  - Accesso multi-dispositivo
  - Discovery attiva
  - Inviti liberi + referral controllato
  - Disabilitazione audit visibile
  - Anti-sybil & antifrode base
  - Associazione root identity ↔ wallet unico

---

<details>
<summary><strong>STEP B — Vincoli Principali FASE 2 (Precompilati)</strong></summary>

## 2. STEP B — Vincoli principali FASE 2 (Precompilati)

| # | Vincolo / Principio | Sezione | Stato | Note operative |
|---|-------------------|--------|-------|----------------|
| 1 | Root identity non eliminabile | Identity | ✅ | SSI; separazione root/alias; log audit |
| 2 | Alias e pseudonimi | Identity | ✅ | Disposable identities per multi-community |
| 3 | Anti-sybil compatibile UX | Identity | ✅ | Rate limit + behavioral verification; ZK proofs |
| 4 | Accesso multi-dispositivo | Identity | ✅ | Sincronizzazione sicura tra device |
| 5 | Inviti liberi + referral controllato | Identity | ✅ | Referral anti-fraud, bonus interazioni reali |
| 6 | Discovery attiva | Identity | ✅ | Raccomandazioni opt-in; privacy-respecting |
| 7 | Associazione root identity ↔ wallet unico | Identity | ✅ | Mapping crittografico; privacy-preserving |

</details>

---

<details>
<summary><strong>Audit Ostile Precompilato FASE 2</strong></summary>

## 3. Audit Ostile Precompilato FASE 2

| # | Vincolo | Tipo rischio | Impatto | Azione suggerita | Responsabile |
|---|---------|-------------|---------|-----------------|--------------|
| 1 | Root identity non eliminabile | Alias aggirano vincolo | Privacy compromessa | Controlli SSI, log audit | Lead Engineer |
| 2 | Alias e pseudonimi | Uso improprio | Confusione identita | Limitazioni temporanee; behavioral check | Lead Engineer |
| 3 | Anti-sybil | Tecniche aggirabili | Frodi/abusi | ZK proofs + rate limit | Lead Engineer |
| 4 | Accesso multi-dispositivo | Sync fallisce | Perdita dati | Test offline-first, fallback edge | DevOps Expert |
| 5 | Referral controllato | Referral fraudolenti | Crescita artificiale | Anti-fraud ZK; metriche qualita | Lead Engineer |
| 6 | Discovery attiva | Privacy leak | Violazione fiducia | Opt-in obbligatorio, controlli audit | UX Analyst |

</details>

---

<details>
<summary><strong>Simulazione Early Adopter FASE 2</strong></summary>

## 4. Simulazione Early Adopter FASE 2

### Archetipi e Dolori

| Archetipo | Obiettivo | Dolore attuale | Necessita risolutiva |
|-----------|-----------|---------------|---------------------|
| Community Builder | Gestire identita multi-community | Alias non riconosciuti tra device | Sincronizzazione sicura e profilazione opt-in |
| Creator multipiattaforma | Coordinare audience frammentata | Account separati, confusione messaggi | Mapping root identity ↔ wallet unico; discovery centralizzata |
| Team Informale cross-country | Collaborare in remoto | Accesso multi-device non coerente | Offline-first + sincronizzazione automatica |

### Scenario d'uso Archetipico 1 — Community Builder

- **Step principali**: 
  1. Creazione account personale Iris
  2. Configurazione alias e pseudonimi
  3. Gestione multi-community
  4. Discovery attiva opt-in
- **Vincoli applicati**: Root identity, Alias e pseudonimi, Multi-community, Discovery attiva
- **Dolori residui**: ⚠️ Sincronizzazione alias tra device lenta
- **Successi principali**: ✅ Identita fluida, controllata, privacy-safe

### Scenario d'uso Archetipico 2 — Creator multipiattaforma

- **Step principali**: 
  1. Account personale con root identity
  2. Mapping wallet unico
  3. Discovery centralizzata
  4. Interoperabilita con Social Coach
- **Vincoli applicati**: Root identity ↔ wallet, Discovery attiva, Referral controllato
- **Dolori residui**: ⚠️ Referral non filtrati completamente
- **Successi principali**: ✅ Hub identita e wallet unico, interoperabilita con Social Coach

### Scenario d'uso Archetipico 3 — Team Informale

- **Step principali**: 
  1. Account multi-device
  2. Alias dinamici per collaboratori
  3. Offline-first sync
  4. Reflection coach attivo
- **Vincoli applicati**: Accesso multi-dispositivo, Alias dinamici, Offline-first
- **Dolori residui**: ⚠️ Latenza sync edge in zone con bassa connettivita
- **Successi principali**: ✅ Collaborazione remota fluida, reflection coach attivo

</details>

---

<details>
<summary><strong>Workflow Operativo FASE 2 (Precompilato)</strong></summary>

## 5. Workflow Operativo FASE 2 (Precompilato)

### 5.1 Daily Check-in STEP B

| Data | Vincolo | Stato ✅/⚠️ | Note | Responsabile |
|------|---------|-------------|------|--------------|
| 25/01/2026 | Root identity | ✅ | Mapping verificato; SSI controlli | Dev Team |
| 25/01/2026 | Alias e pseudonimi | ⚠️ | Alcuni alias non sincronizzati tra device | Dev Team |
| 25/01/2026 | Accesso multi-dispositivo | ✅ | Test sync ok | Dev Team |
| 25/01/2026 | Discovery attiva | ✅ | Opt-in verificato; privacy-respecting | UX Analyst |

### 5.2 Audit Ostile Settimanale FASE 2

| Settimana | Vincolo | Tipo rischio | Azione | Responsabile |
|-----------|---------|-------------|--------|--------------|
| Week 5 | Alias e pseudonimi | Sincronizzazione fallisce | Fix edge sync; test offline-first | DevOps Expert |
| Week 5 | Anti-sybil | Tentativi aggiramento | Rate limit + ZK proofs; behavioral checks | Lead Engineer |
| Week 5 | Referral controllato | Crescita artificiale | Validazione bonus interazioni reali; anti-fraud ZK | UX Analyst |

### 5.3 Early Adopter Bi-Settimanale FASE 2

| Archetipo | Dolore residuo | Successo | Note | Responsabile |
|-----------|----------------|----------|------|--------------|
| Community Builder | ⚠️ Sincronizzazione alias lenta | ✅ Identita fluida multi-community | Monitorare latenza sync | UX Analyst |
| Creator multipiattaforma | ⚠️ Referral non filtrati | ✅ Hub identita e wallet unico | Ottimizzare filtri referral | UX Analyst |
| Team Informale | ⚠️ Latenza sync edge | ✅ Collaborazione remota fluida | Test fallback offline-first | DevOps Expert |

### 5.4 Reporting Mensile / Checkpoint FASE 2

| Mese | Vincoli STEP B | Audit Ostile | Early Adopter | Decisioni vincolanti | KPI | Responsabile |
|------|----------------|--------------|---------------|-------------------|-----|--------------|
| Febbraio 2026 | Tutti ✅ | Tabella aggiornata | Dolori residui documentati | Mitigazioni compatibili STEP B | Engagement 70%; Retention 65%; Nudges 60% | Principal Engineer |

</details>

---

<details>
<summary><strong>Sezione Escalation FASE 2</strong></summary>

## 6. Sezione Escalation FASE 2

| Tipo Issue | Trigger | Azione immediata | Escalation | Responsabile |
|------------|--------|-----------------|------------|--------------|
| Violazione STEP B | Commit/PR non conforme | Bloccare merge, notifica team | Principal Engineer + Product Owner | Escalation Officer |
| Overuse AI / Coach | >60% conversazioni mediate | Reminder "Human Touch"; metriche reset | UX Analyst + AI Specialist | Escalation Officer |
| Sync multi-device | Latenza >100ms | Switch edge fallback; test offline-first | DevOps Expert + Lead Engineer | Escalation Officer |
| Privacy leak | Opt-in violato | Revoca accesso temporaneo; audit immediato | UX Analyst + Lead Engineer | Escalation Officer |
| Root identity compromessa | Correlazione indebita | Blocco account temporaneo; review SSI | Lead Engineer + Principal Engineer | Escalation Officer |

</details>

---

<details>
<summary><strong>KPI e Monitoraggio FASE 2</strong></summary>

## 7. KPI e Monitoraggio FASE 2

- **Engagement reale**: 70% early adopter attivi
- **Retention**: 65% utenti continuano ad usare MVP
- **Contributi qualitativi**: 80% messaggi marcati "Decisione/Azione"
- **Conformita STEP B**: 100% vincoli rispettati
- **AI Engagement**: 55–65% nudges utili (accettati/modificati)
- **Anti-Isolamento**: 75% interazioni umane dirette (post-uso coach)
- **Privacy Compliance**: 100% task on-device; 0% leaks auditati
- **Sync multi-device**: <100ms latenza media; 99% successo sync
- **Discovery attiva**: 60% opt-in; 0% privacy leaks

</details>

---

<details>
<summary><strong>Sintesi Finale FASE 2</strong></summary>

## 8. Sintesi Finale FASE 2

- **Dolori principali accettabili**: Sincronizzazione alias lenta tra device, battery drain leggero on-device
- **Dolori da mitigare senza violare STEP B**: Referral non filtrati completamente, overuse coach in team remoti
- **Successi principali**: Account fluido multi-device, root identity sicura, discovery attiva privacy-respecting, Social Coach on-device
- **Collegamento FASE 1 → FASE 2**: 
  - STEP B ereditato e aggiornato con vincoli FASE 2
  - Audit Ostile esteso con rischi specifici FASE 2
  - Early Adopter feedback correlato a entrambe le fasi
- **Decisioni vincolanti**: 
  - Freeze scope con AI guardrails
  - Priorita edge/offline-first per sync multi-device
  - Metriche anti-isolamento obbligatorie
  - Nessuna deviazione dai vincoli STEP B senza eccezione documentata
  - Audit Ostile aggiornato e tracciabile in ogni ciclo
  - Early Adopter feedback sempre correlato ai vincoli

</details>

---

**Prompt pronto per Cursor:**  
Incolla in un file `.md` e usa AI per generare versioni "Refine 10/10", ottimizzando **multi-device identity, Social Coach on-device e metriche anti-isolamento**.  
Il documento e pronto per il team IRIS per l'esecuzione operativa FASE 2.
