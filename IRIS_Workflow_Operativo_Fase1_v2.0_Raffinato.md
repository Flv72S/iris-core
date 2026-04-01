---
title: "IRIS — Workflow Operativo FASE 1 v2.0 (Raffinato 10/10)"
author: "Team IRIS / Principal Engineer"
version: "2.0"
date: "2026-01-24"
tags: ["FASE1", "Workflow", "Precompilato", "Cursor-ready"]
---

# IRIS — Workflow Operativo FASE 1 v2.0 (Raffinato 10/10)

> Documento operativo completo, pronto all'uso dal team FASE 1 di IRIS.  
> Tutte le tabelle, template, KPI e workflow sono precompilati.  
> Approccio operativo, etico e decentralizzato.

---

<details>
<summary><strong>STEP B — Vincoli Precompilati</strong></summary>

## 1. Congelamento STEP B (Precompilato con Espansioni)

| # | Vincolo / Principio | Sezione | Stato | Note operative |
|---|-------------------|--------|-------|----------------|
| 1 | No dark pattern | Principi Etici | ✅ | Solo notifiche informative, metriche click-through proibite; reminder soft per "Human Touch" |
| 2 | No spam economy | Principi Etici | ✅ | Incentivi basati su qualita contributi e retention; bonus per interazioni umane verificate |
| 3 | IRIS = Protocollo di Relazione | USP | ✅ | Thread obbligatori, messaggi con stato; integrazione Social Coach per empatia |
| 4 | Thread obbligatori | Messaging | ✅ | Tutti i messaggi devono appartenere a thread; visualizzazioni gerarchiche "Prisma" |
| 5 | Messaggi con stato | Messaging | ✅ | Stato validato lato server/edge; sincronizzazione offline-first |
| 6 | Root identity non eliminabile | Identity | ✅ | Separazione crittografica root/alias; SSI per sovranita dati |
| 7 | Alias e pseudonimi | Identity | ✅ | Proiezioni non cancellabili; disposable per community |
| 8 | Anti-sybil compatibile UX | Identity | ✅ | Rate limit + behavioral verification; ZK proofs per proof of human |
| 9 | Community come unita primaria | Community | ✅ | DM limitati se non contestuali; hub per interoperabilita |
| 10 | Memoria consultiva | Community | ✅ | Timeline per community, consultabile; AI sintesi on-device |
| 11 | Reputazione composita | Community | ✅ | Score legati a root identity; bonus "Luce" per uso coach positivo |
| 12 | AI opt-in | AI | ✅ | Opt-in separato e revocabile; default on-device |
| 13 | Social Coach opzionale | AI | ✅ | Linguaggio descrittivo, opt-out esplicito; modelli quantizzati (es. Phi-3.5-mini) |
| 14 | Scope MVP rispettato | Scope | ✅ | Freeze scope hard; no feature premature come AI cloud-heavy |
| 15 | Allineamento Core Condiviso (Colibri) | Core | ✅ | Bloccare modifiche non autorizzate; astrazione policy edge-compatible |
| 16 | Social Coach on-device | AI | ✅ | Modelli LLM quantizzati locali; nudges non prescrittivi, opt-out esplicito |
| 17 | Interoperabilita Matrix-based | Bridge | ✅ | Bridge per WhatsApp/Telegram/Signal; spostamento graduale contatti |

</details>

---

<details>
<summary><strong>Audit Ostile Reale (Atto 2)</strong></summary>

## 2. Audit Ostile Reale (Atto 2) — Precompilato con Espansioni

| # | Vincolo | Tipo rischio | Impatto | Azione suggerita | Responsabile |
|---|---------|-------------|---------|-----------------|--------------|
| 1 | No dark pattern | Notifiche camuffate | Riduzione fiducia | Bloccare metriche click-through; test UX A/B | Lead Engineer |
| 2 | No spam economy | Referral incentivanti troppo | Crescita artificiale | Incentivi su qualita, non quantita; ZK per anti-fraud | Lead Engineer |
| 3 | IRIS = Protocollo di Relazione | Chat piatta | Perdita differenziazione | Thread obbligatori e messaggi con stato; validazione Prisma | Lead Engineer |
| 4 | Thread obbligatori | Ignorati dall'utente | Caos mascherato | Thread come unita primaria navigabile; UX enforcement | Lead Engineer |
| 5 | Messaggi con stato | Client legacy non aggiorna | Perdita consistenza | Validazione server/edge obbligatoria; fallback P2P | Lead Engineer |
| 6 | Root identity non eliminabile | Alias aggirano vincolo | Privacy rischiata | Separazione root/alias + log audit; SSI checks | Lead Engineer |
| 7 | Anti-sybil | Tecniche leggere aggirabili | Frodi / abusi | Rate limit + behavioral checks; ZK proofs | Lead Engineer |
| 8 | Community primaria | DM bypassano comunita | Perdita memoria condivisa | Limitare DM non contestuali; bridge interoperability | Lead Engineer |
| 9 | Reputazione composita | Duplicazione identita | Score distorto | Solo root identity verificata; "Luce" non trasferibile | Lead Engineer |
| 10 | AI opt-in | Opt-in implicito | Violazione fiducia | Opt-in separato e revocabile; dashboard trasparenza | Lead Engineer |
| 11 | Social Coach | Nudges percepiti come prescrittivi | Abbandono utenti | Linguaggio descrittivo, opt-out; metriche anti-isolamento | UX Analyst |
| 12 | Scope MVP | Feature premature | Ritardo deploy | Freeze scope con checklist hard; no AI cloud | Lead Engineer |
| 13 | Allineamento Core | Estensioni non autorizzate | Conflitto Core | Bloccare modifiche core + logging; policy.json edge | Lead Engineer |
| 14 | Social Coach | Overuse AI (>60%) | Isolamento utenti | Limiti "Human Touch" con reminder; test % interazioni umane | UX Analyst |
| 15 | Edge/Serverless | Latenza in fallback | Perdita offline-first | Priorita on-device; stress test edge (Cloudflare Workers) | DevOps Expert |

</details>

---

<details>
<summary><strong>Simulazione Early Adopter (Atto 3)</strong></summary>

## 3. Simulazione Early Adopter (Atto 3) — Precompilato con Integrazioni Coach

### Archetipi

| Archetipo | Obiettivo | Dolore attuale | Necessita risolutiva |
|-----------|-----------|---------------|---------------------|
| Community Builder | Gestire community coese | Chat caotiche, thread persi | Thread ordinati, memoria consultiva, moderazione semplice; coach per empatia |
| Creator multipiattaforma | Coordinare audience frammentata | Follower su canali diversi | Hub unico per messaggi e contenuti, interoperabilita; nudges coach per engagement |
| Team Informale cross-country | Collaborare in remoto | Chat disperse, perdita contesto | Identita fluida, messaggi con stato, notifiche intelligenti; reflection coach post-chat |

### Scenario d'uso Archetipico 1 — Community Builder

- **Step principali**: 
  1. Creazione workspace/community
  2. Invio messaggi con thread obbligatori
  3. Consultazione timeline e reputazione
  4. Uso opzionale Social Coach per moderazione empatica
- **Vincoli applicati**: Thread obbligatori, Messaggi con stato, Community primaria, Social Coach opt-in
- **Dolori residui**: ⚠️ Notifiche AI intrusive; ⚠️ Nudges coach in thread decisionali
- **Successi principali**: ✅ Messaggi ordinati; ✅ Memoria consultiva; ✅ Coach amplifica empatia

### Scenario d'uso Archetipico 2 — Creator multipiattaforma

- **Step principali**: 
  1. Collegamento contatti esterni via Iris Bridge
  2. Invio contenuti multipiattaforma
  3. Consultazione contributi e reputazione
  4. Nudges coach per risposte audience
- **Vincoli applicati**: Interoperabilita MVP, Score reputazione root identity, Social Coach on-device
- **Dolori residui**: ⚠️ Referral non filtrati; ⚠️ Battery drain da coach on-device
- **Successi principali**: ✅ Hub unico messaggi/contenuti; ✅ Identita fluida; ✅ Coach per engagement positivo

### Scenario d'uso Archetipico 3 — Team Informale

- **Step principali**: 
  1. Creazione workspace team
  2. Inviti controllati e gestione thread
  3. Chat offline-first e sincronizzazione
  4. Role-play coach per riunioni
- **Vincoli applicati**: Offline-first, Thread obbligatori, Identity mapping, Social Coach opzionale
- **Dolori residui**: ⚠️ Alias dinamici collaboratori esterni; ⚠️ Overuse coach in team remoti
- **Successi principali**: ✅ Comunicazione ordinata; ✅ Messaggi con stato chiaro; ✅ Reflection coach per crescita

</details>

---

<details>
<summary><strong>Ruoli del Team</strong></summary>

## 4. Ruoli del Team

| Ruolo | Responsabilita principale |
|-------|---------------------------|
| Dev Team | Implementazione conforme STEP B, daily check-in |
| Lead Engineer | Aggiornamento Audit Ostile, supervisione tecnica |
| UX Analyst | Raccolta Early Adopter feedback, analisi dolori |
| AI Specialist | Social Coach on-device, metriche nudges, guardrails AI |
| DevOps Expert | Edge/serverless, resilienza, stress test e fallback |
| Principal Engineer | Validazione finale, decision-making vincolante |
| Product Owner | Coordinamento FASE 1, approvazioni e prioritizzazione |
| Escalation Officer | Gestione issue critiche e violazioni STEP B |

</details>

---

<details>
<summary><strong>Workflow Operativo & Template</strong></summary>

## 5. Workflow Operativo Precompilato (con AI Metrics)

### 5.1 Daily Check-in STEP B

| Data | Vincolo | Stato ✅/⚠️ | Note | Responsabile |
|------|---------|-------------|------|--------------|
| 24/01/2026 | Thread obbligatori | ✅ | Tutti i messaggi appartengono a thread | Dev Team |
| 24/01/2026 | Messaggi con stato | ⚠️ | Client legacy non aggiorna metadati | Dev Team |
| 24/01/2026 | Identity root/alias | ✅ | Mapping corretto; SSI verificato | Dev Team |
| 24/01/2026 | Social Coach on-device | ✅ | Modelli quantizzati testati; opt-out funzionale | AI Specialist |

### 5.2 Audit Ostile Settimanale

| Settimana | Vincolo | Tipo rischio | Azione | Responsabile |
|-----------|---------|-------------|--------|--------------|
| Week 4 | No dark pattern | Notifiche camuffate | Bloccare metriche click-through | Lead Engineer |
| Week 4 | AI opt-in | Attivazione implicita | Opt-in separato e revocabile | Lead Engineer |
| Week 4 | Social Coach | Overuse AI | Reminder "Human Touch"; metriche reset | UX Analyst |

### 5.3 Early Adopter Bi-Settimanale

| Archetipo | Dolore residuo | Successo | Note | Responsabile |
|-----------|----------------|----------|------|--------------|
| Community Builder | ⚠️ Notifiche AI intrusive | ✅ Thread ordinati | Monitorare feedback UX; % nudges accettati | UX Analyst |
| Creator multipiattaforma | ⚠️ Referral non filtrati | ✅ Hub unico contenuti | Ottimizzare filtri referral; coach engagement | UX Analyst |
| Team Informale | ⚠️ Alias dinamici | ✅ Messaggi con stato | Nessuna violazione STEP B; reflection coach | UX Analyst |

### 5.4 Reporting Mensile / Checkpoint FASE 1

| Mese | Vincoli STEP B | Audit Ostile | Early Adopter | Decisioni vincolanti | AI Metrics | Responsabile |
|------|----------------|--------------|---------------|-------------------|------------|--------------|
| Gennaio 2026 | Tutti tranne 1 ⚠️ | Tabella aggiornata | Dolori residui documentati | Freeze scope; AI guardrails | Engagement 65–75%; Retention 60–70%; Nudges utili 50–70% | Principal Engineer |

</details>

---

<details>
<summary><strong>Sezione Escalation (Trigger AI/Edge)</strong></summary>

## 6. Sezione Escalation (con Trigger AI/Edge)

| Tipo Issue | Trigger | Azione immediata | Escalation | Responsabile |
|------------|--------|-----------------|------------|--------------|
| Violazione STEP B | Commit/PR non conforme | Bloccare merge, notifica team | Principal Engineer + Product Owner | Escalation Officer |
| Rischio Early Adopter critico | Feedback ⚠️/❌ ricorrente | Analisi rapida | Revisione vincoli, aggiornamento Audit Ostile | Escalation Officer |
| Bug critico/Security | Crash, perdita dati | Hotfix immediato, log | Review Lead Engineer + Principal Engineer | Escalation Officer |
| Overuse AI | >60% conversazioni mediate | Reminder "Human Touch"; metriche reset | UX Analyst + AI Specialist | Escalation Officer |
| Edge Failure | Latenza fallback >100ms | Switch on-device; stress test | DevOps Expert + Lead Engineer | Escalation Officer |

</details>

---

<details>
<summary><strong>KPI e Monitoraggio</strong></summary>

## 7. KPI e Monitoraggio (Raffinato)

- **Engagement reale**: 65–75% early adopter attivi
- **Retention**: 60–70% utenti continuano ad usare MVP
- **Contributi qualitativi**: 80% messaggi marcati "Decisione/Azione"
- **Conformita STEP B**: 95% vincoli rispettati in commit/PR
- **Dolori Early Adopter**: # problemi segnalati / risolti
- **AI Engagement**: 50–70% nudges utili (accettati/modificati)
- **Anti-Isolamento**: 70–80% interazioni umane dirette (post-uso coach)
- **Privacy Compliance**: 100% task on-device default; 0% leaks auditati

</details>

---

<details>
<summary><strong>Sintesi Finale</strong></summary>

## 8. Sintesi Finale

- **Dolori principali accettabili**: Notifiche AI intrusive, Alias dinamici collaboratori esterni, Battery drain on-device
- **Dolori da mitigare senza violare STEP B**: Filtraggio referral e notifiche AI; limiti overuse coach; ottimizzazioni edge
- **Successi principali**: Thread obbligatori, messaggi con stato, memoria consultiva, hub multipiattaforma, empatia amplificata via Social Coach
- **Collegamento STEP B → Audit Ostile → Early Adopter**: Integrato e vincolante; allineato a cronoprogramma IRIS (FASE 1-11)
- **Decisioni vincolanti**: 
  - Freeze scope con AI guardrails
  - Priorita on-device/edge
  - Metriche anti-isolamento obbligatorie
  - Nessuna deviazione dai vincoli STEP B senza eccezione documentata
  - Audit Ostile aggiornato e tracciabile in ogni ciclo
  - Early Adopter feedback sempre correlato ai vincoli

</details>

---

**Documento pronto per l'uso operativo vincolante dal team IRIS — FASE 1 v2.0 (Raffinato 10/10).**
