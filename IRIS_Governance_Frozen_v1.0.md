---
title: "IRIS — Governance Frozen v1.0"
author: "System Architect & Governance Officer"
version: "1.0"
date: "2026-01-24"
status: "FROZEN"
tags: ["Governance", "STEP-B", "FASE1", "FASE2", "Vincolante"]
---

# IRIS — Governance Frozen v1.0

> Documento normativo vincolante per FASE 1 e FASE 2.  
> Fonte di verita unica per code review, PR rejection e audit.  
> Stato: **FROZEN** — non modificabile senza nuovo atto di governance.

---

## 1. Premessa di Congelamento

### Scopo del Freeze

Questo documento congela formalmente la governance del sistema IRIS prima di qualsiasi implementazione di codice. La governance e definita come l'insieme di principi, vincoli tecnici, metriche e processi che garantiscono che IRIS rimanga fedele alla sua visione: **IRIS = Protocollo di Relazione**.

### Perche IRIS richiede governance forte

IRIS non e un prodotto generico. E un sistema che privilegia relazioni strutturate su engagement, continuita su crescita virale, agency dell'utente su ottimizzazione algoritmica. Senza governance vincolante, il sistema rischia di deriva verso:
- Messenger tradizionale con chat infinita
- Social network engagement-driven
- Piattaforma enterprise compliance-heavy

La governance forte e necessaria per mantenere l'integrita del protocollo relazionale.

### Ambito di validita

- **Fasi coperte**: FASE 1 e FASE 2
- **Validita temporale**: fino alla revisione formale prima di FASE 3
- **Applicabilita**: tutti i moduli, componenti, API e interfacce utente
- **Enforcement**: automatico via CI/CD, code review obbligatoria, audit periodici

---

## 2. Principi Non Negoziabili di IRIS

1. **No dark pattern**: nessuna manipolazione dell'attenzione dell'utente tramite pattern di engagement.
2. **Agency dell'utente > engagement**: l'utente controlla le proprie interazioni; il sistema non forza comportamenti.
3. **Relazioni > traffico**: il valore e nella qualita delle relazioni, non nel volume di messaggi.
4. **Identita come protocollo, non profilo**: l'identita e strutturale e relazionale, non un database di attributi.
5. **AI come supporto, non sostituzione**: l'AI assiste, non decide; l'AI e opt-in, non default.
6. **Privacy by design**: dati relazionali sotto controllo degli utenti e delle community; on-device default.
7. **Community-first**: la community e unita primaria di contesto; l'individuo non e il centro della rete.
8. **Trasparenza operativa**: ogni decisione AI, ogni enforcement, ogni aggregazione e tracciabile e spiegabile.
9. **Anti-isolamento**: il sistema promuove interazioni umane dirette; metriche obbligatorie per prevenire isolamento.
10. **Core immutabile**: il modello relazionale di base (stati, ruoli, transizioni) non puo essere modificato senza nuovo atto di governance.

---

## 3. STEP B — Vincoli Congelati (CORE)

| ID | Principio di origine | Descrizione vincolo | Ambito | Fase | Severita violazione |
|---|---------------------|---------------------|--------|------|---------------------|
| SB-001 | No dark pattern | Nessuna metrica di click-through per notifiche; solo notifiche informative | Client / UX | 1, 2 | Blocker |
| SB-002 | No spam economy | Nessun beneficio legato a inviti o volume; incentivi solo su qualita contributi | Server / Business Logic | 1, 2 | Blocker |
| SB-003 | No gamification tossica | Nessun ranking, badge, score o progressione competitiva applicata alle relazioni | Client / Server | 1, 2 | Blocker |
| SB-004 | Diritto all'oblio | Cancellazione effettiva dei dati personali; separazione continuita relazionale / dati personali | Server / Storage | 1, 2 | Critical |
| SB-005 | Proprieta del dato | Portabilita completa di stati, ruoli e contesti senza perdita semantica | Server / API | 1, 2 | Critical |
| SB-006 | Trasparenza AI | Ogni output AI deve dichiarare che e AI, perimetro dati osservati e scopo | AI / Client | 1, 2 | Blocker |
| SB-007 | Protocollo di Relazione | Thread obbligatori; messaggi con stato e contesto; no chat infinita come modalita primaria | Client / Server | 1, 2 | Blocker |
| SB-008 | Thread obbligatori | Ogni messaggio valido deve appartenere a un thread/contesto attivo | Server / Validation | 1, 2 | Blocker |
| SB-009 | Messaggi con stato | Stato e contesto obbligatori e verificabili per ogni messaggio | Server / Validation | 1, 2 | Blocker |
| SB-010 | Chat infinita non primaria | Modalita primaria definita come default UI/API; vietato default su flusso lineare non contestualizzato | Client / UX | 1, 2 | Blocker |
| SB-011 | Root identity non eliminabile | Separazione crittografica root/alias; continuita relazionale preservata anche in caso di uscita | Identity / Storage | 1, 2 | Critical |
| SB-012 | Alias come projection | Alias sempre derivabile da root identity per audit interno; vietata creazione identita indipendenti | Identity / Server | 1, 2 | Blocker |
| SB-013 | Anti-sybil compatibile UX | Soglia massima di frizione definita; rate limit + behavioral verification; ZK proofs | Identity / Server | 1, 2 | Major |
| SB-014 | Community unita primaria | Comunicazione non contestualizzata non puo essere modalita primaria | Client / Server | 1, 2 | Blocker |
| SB-015 | Memoria consultiva | Memoria per-community, consultiva; vietato uso memoria per abilitare/bloccare azioni | Server / Business Logic | 1, 2 | Blocker |
| SB-016 | Reputazione non trasferibile | Vietata aggregazione o trasferimento di segnali tra community; validita solo locale | Server / Business Logic | 1, 2 | Blocker |
| SB-017 | AI opt-in | Consenso esplicito, specifico e revocabile; default disattivo senza eccezioni | AI / Client | 1, 2 | Blocker |
| SB-018 | Social Coach opzionale | Core funziona senza coach; coach non requisito per funzioni base | AI / Architecture | 1, 2 | Blocker |
| SB-019 | AI non mediatore | AI non suggerisce azioni prescrittive su emozioni o conflitti; solo descrizioni contestuali | AI / Business Logic | 1, 2 | Blocker |
| SB-020 | Scope MVP rispettato | Vietato introdurre campi, API o logiche non usate dall'MVP | Server / Architecture | 1, 2 | Blocker |
| SB-021 | Allineamento Core Condiviso | Elenco chiuso di stati/ruoli/transizioni immutabili; ogni deviazione e violazione | Core / Architecture | 1, 2 | Blocker |
| SB-022 | Social Coach on-device | Modelli LLM quantizzati locali; nudges non prescrittivi; opt-out esplicito | AI / Client | 1, 2 | Critical |
| SB-023 | Interoperabilita Matrix-based | Bridge verso canali esterni solo come migrazione; non altera il core | Bridge / Architecture | 1, 2 | Major |
| SB-024 | Accesso multi-dispositivo | Sincronizzazione sicura tra device; offline-first; fallback edge | Identity / Server | 2 | Critical |
| SB-025 | Inviti liberi + referral controllato | Referral anti-fraud; bonus solo su interazioni reali verificate | Identity / Business Logic | 2 | Major |
| SB-026 | Discovery attiva | Raccomandazioni opt-in obbligatorio; privacy-respecting; controlli audit | Identity / Client | 2 | Critical |
| SB-027 | Root identity ↔ wallet unico | Mapping crittografico; privacy-preserving; non trasferibile | Identity / Storage | 2 | Critical |

**Regola di enforcement**: Qualsiasi violazione di un vincolo "Blocker" comporta **rifiuto automatico della PR**. Violazioni "Critical" richiedono approvazione esplicita di Principal Engineer. Violazioni "Major" richiedono documentazione e mitigazione.

---

## 4. KPI Minimi Congelati

| KPI | Descrizione | Fase | Soglia minima accettabile | Frequenza misurazione | Azione automatica se sotto soglia |
|-----|-------------|------|---------------------------|----------------------|-----------------------------------|
| Continuita relazionale | % contesti riutilizzati entro 14 giorni | 1, 2 | >= 60% | Settimanale | Alert Principal Engineer |
| Riduzione del rumore | % messaggi fuori contesto | 1, 2 | <= 30% | Giornaliera | Alert Dev Team |
| Adozione contesti | % messaggi con stato valido | 1, 2 | >= 95% | Giornaliera | Blocco messaggi invalidi |
| Conformita STEP B | % vincoli rispettati in commit/PR | 1, 2 | 100% | Per commit | Blocco merge automatico |
| Human Touch Rate | % interazioni umane dirette (post-uso coach) | 1, 2 | 70-80% | Settimanale | Reminder "Human Touch" se < 70% |
| AI Engagement | % nudges utili (accettati/modificati) | 1, 2 | 50-70% | Settimanale | Review se > 70% o < 50% |
| Privacy Compliance | % task on-device default | 1, 2 | 100% | Giornaliera | Blocco feature se non on-device |
| Engagement reale | % early adopter attivi | 1 | 65-75% | Mensile | Review strategia se < 65% |
| Retention | % utenti continuano ad usare MVP | 1, 2 | 60-70% | Mensile | Review onboarding se < 60% |
| Sync multi-device | Latenza media sync | 2 | < 100ms | Giornaliera | Switch fallback se > 100ms |
| Discovery opt-in | % opt-in discovery attiva | 2 | >= 60% | Settimanale | Review privacy se < 60% |

---

## 5. Trigger di Escalation

| Trigger | Fonte | Gravita | Azione obbligatoria | Chi viene coinvolto |
|---------|-------|---------|---------------------|---------------------|
| Violazione vincolo Blocker | CI/CD / Code Review | Critica | Bloccare merge immediato; notifica team | Principal Engineer + Product Owner + Escalation Officer |
| Violazione vincolo Critical | CI/CD / Code Review | Alta | Richiedere approvazione esplicita; documentare eccezione | Principal Engineer + Lead Engineer |
| KPI sotto soglia minima | Dashboard / Monitoring | Media-Alta | Alert automatico; review obbligatoria entro 24h | Lead Engineer + UX Analyst (se UX) + Principal Engineer |
| Overuse AI (>60% conversazioni mediate) | Monitoring AI | Alta | Reminder "Human Touch"; reset metriche; review guardrails | UX Analyst + AI Specialist + Principal Engineer |
| Privacy leak rilevato | Audit / User Report | Critica | Blocco feature immediato; audit completo; notifica utenti | Principal Engineer + DevOps Expert + Escalation Officer |
| Edge failure (latenza >100ms per 10 min) | Monitoring Edge | Alta | Switch on-device; stress test; review architettura | DevOps Expert + Lead Engineer + Principal Engineer |
| Root identity compromessa | Audit / Security | Critica | Blocco account temporaneo; review SSI; audit completo | Lead Engineer + Principal Engineer + Escalation Officer |
| Feedback Early Adopter ⚠️/❌ ricorrente | User Report / Analytics | Media | Analisi rapida; aggiornamento Audit Ostile; mitigazione | UX Analyst + Lead Engineer + Principal Engineer |

**Regola di escalation**: L'escalation e **inevitabile**, non opzionale. Ogni trigger attiva automaticamente il processo definito. Nessun trigger puo essere ignorato senza documentazione formale e approvazione di Principal Engineer.

---

## 6. Decisione Formale di Governance (CLAUSOLA CHIAVE)

### Testo normativo vincolante

**Qualsiasi Pull Request, feature, ottimizzazione o refactor che violi anche un solo vincolo definito nello STEP B congelato verra rifiutato, anche se**:
- migliora performance
- migliora engagement
- riduce costi
- accelera il go-to-market
- e richiesto da stakeholder
- e suggerito da early adopter
- risolve un bug critico (a meno che non sia un bug di sicurezza che compromette dati utente)

**Questa clausola e superiore a qualsiasi obiettivo di business di breve termine.**

### Eccezioni consentite

Le uniche eccezioni consentite sono:
1. **Bug di sicurezza critico**: violazione temporanea documentata e approvata da Principal Engineer + Escalation Officer, con piano di ripristino entro 48h.
2. **Modifica formale dello STEP B**: richiede nuovo documento di governance versionato, non una PR.

### Enforcement automatico

- CI/CD pipeline verifica conformita STEP B su ogni commit.
- Code review obbligatoria per ogni PR; reviewer deve verificare conformita.
- Audit periodici (settimanali) verificano conformita runtime.
- Violazioni rilevate attivano escalation automatica.

---

## 7. Ambito di Modifica Consentito

### Cosa puo essere modificato

- **Implementazioni interne**: algoritmi, strutture dati, ottimizzazioni performance, refactoring, senza alterare semantica esterna.
- **UI/UX non vincolanti**: layout, colori, animazioni, posizionamento elementi, purché non introducano dark pattern o violino principi.
- **Configurazioni**: parametri, soglie, timeout, rate limit, purché rispettino vincoli STEP B.
- **Documentazione**: commenti, README, guide utente, purché non contraddicano vincoli.
- **Test e monitoring**: suite di test, metriche di monitoraggio, dashboard, purché non alterino vincoli.

### Cosa non puo essere modificato senza nuovo atto di governance

- **Vincoli STEP B**: nessun vincolo puo essere rimosso, indebolito o aggirato.
- **Principi non negoziabili**: nessun principio puo essere violato o reinterpretato.
- **KPI minimi**: soglie minime non possono essere abbassate senza nuovo documento.
- **Trigger di escalation**: trigger e azioni obbligatorie non possono essere disabilitati.
- **Core relazionale**: stati, ruoli, transizioni, identita contesto non possono essere modificati semanticamente.
- **Clausola formale di governance**: questa sezione non puo essere modificata senza nuovo atto di governance.

### Processo per sbloccare un vincolo

1. **Richiesta formale**: documento che giustifica la modifica, con analisi di impatto.
2. **Review architetturale**: Principal Engineer + Lead Engineer + Product Owner.
3. **Nuovo documento di governance**: versione incrementale (v1.1, v1.2, etc.) che modifica esplicitamente il vincolo.
4. **Approvazione formale**: firma di Principal Engineer + Product Owner.
5. **Comunicazione al team**: notifica formale e aggiornamento documentazione.

**Nessuna PR puo sbloccare un vincolo direttamente.**

---

## 8. Stato del Documento

- **Stato**: **FROZEN**
- **Versione**: v1.0
- **Fasi coperte**: FASE 1 + FASE 2
- **Data di congelamento**: 2026-01-24
- **Condizione di revisione**: solo prima di FASE 3, con nuovo atto di governance formale
- **Validita**: fino a revisione formale o fino a completamento FASE 2

### Riferimenti normativi

Questo documento e la fonte di verita unica per:
- Code review e PR rejection
- Audit interni ed esterni
- Decisioni architetturali
- Dispute tecniche
- Compliance verifiche

### Tracciabilita

Ogni modifica futura a questo documento deve essere:
- Versionata (v1.1, v1.2, etc.)
- Documentata con motivazione esplicita
- Approvata formalmente
- Tracciata in changelog separato

---

**Documento congelato e vincolante per FASE 1 e FASE 2 di IRIS.**  
**Nessuna implementazione puo procedere senza conformita a questo documento.**
