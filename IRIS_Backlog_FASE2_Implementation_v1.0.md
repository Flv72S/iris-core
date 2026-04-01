---
title: "IRIS — Backlog FASE 2 Implementation v1.0"
author: "Principal Engineer + Tech Lead + Delivery Manager"
version: "1.0"
date: "2026-01-24"
status: "Ready for implementation"
dependencies: "IRIS_Governance_Frozen_v1.0.md"
tags: ["FASE2", "Backlog", "Implementation", "Technical"]
---

# IRIS — Backlog FASE 2 Implementation v1.0

> Backlog tecnico esecutivo per FASE 2 di IRIS.  
> Traduzione diretta della governance congelata in task implementabili.  
> Pronto per import in Jira, Linear o GitHub Projects.

---

## 1. Header Documento

- **Nome backlog**: IRIS FASE 2 — Implementation Backlog
- **Fase**: FASE 2
- **Stato**: Ready for implementation
- **Dipendenze**: Governance Frozen v1.0 (IRIS_Governance_Frozen_v1.0.md)
- **Tracciabilita**: Ogni item cita vincoli STEP B e rischi Audit Ostile

---

## 2. Legenda Priorita

- **P0 — Bloccante**: Necessario per funzionamento core; blocca altri item
- **P1 — Critico**: Necessario per sicurezza/etica/scalabilita; violazione STEP B se mancante
- **P2 — Importante**: Migliora qualita o performance; non blocca core
- **P3 — Migliorativo**: Ottimizzazioni non core; puo essere posticipato

---

## 3. Backlog Items (CORE)

### [F2-1.1] Implementazione Root Identity con SSI

**Descrizione**  
Implementare sistema di root identity non eliminabile con supporto SSI (Self-Sovereign Identity). La root identity deve essere separata crittograficamente dagli alias, preservare continuita relazionale anche in caso di uscita utente, e supportare log audit per verifiche.

**Fase**  
FASE 2

**Priorita**  
P0

**Vincoli STEP B**  
- SB-011 (Root identity non eliminabile)
- SB-012 (Alias come projection)

**Rischio Audit Ostile**  
- Audit #1 — Alias aggirano vincolo root identity; mitigato con separazione crittografica e controlli SSI

**Ambito Tecnico**  
Identity / Storage / Cryptography

**Dipendenze**  
- Core relazionale (FASE 1)
- Libreria SSI (es. didkit, veramo)

**Done When (Acceptance Criteria)**  
- [ ] Root identity creata con DID (Decentralized Identifier) conforme standard W3C
- [ ] Separazione crittografica root/alias verificabile; alias non accessibili senza root
- [ ] Log audit per ogni operazione su root identity; log immutabili
- [ ] Continuita relazionale preservata anche se root identity disattivata
- [ ] Test unitari e integrazione per separazione root/alias
- [ ] Documentazione API per gestione root identity

**Metriche di Successo**  
- KPI: Conformita STEP B
- Soglia: 100% vincoli rispettati
- Misurazione: CI/CD pipeline + code review

**Note di Escalation**  
Escalation automatica se: correlazione indebita root/alias rilevata, log audit compromessi, violazione SB-011 o SB-012.

---

### [F2-1.2] Sistema Alias Dinamici Multi-Community

**Descrizione**  
Implementare sistema di alias e pseudonimi come projection della root identity. Alias devono essere disposable per multi-community, sempre derivabili da root identity per audit interno, e sincronizzabili tra device.

**Fase**  
FASE 2

**Priorita**  
P0

**Vincoli STEP B**  
- SB-012 (Alias come projection)
- SB-024 (Accesso multi-dispositivo)

**Rischio Audit Ostile**  
- Audit #2 — Uso improprio alias; mitigato con limitazioni temporanee e behavioral check

**Ambito Tecnico**  
Identity / Server / Sync

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema sync multi-device (F2-1.4)

**Done When (Acceptance Criteria)**  
- [ ] Alias creati come projection di root identity; mapping verificabile
- [ ] Alias disposable per community; limite temporale configurabile
- [ ] Sincronizzazione alias tra device; offline-first con fallback edge
- [ ] Audit trail per creazione/modifica/eliminazione alias
- [ ] Behavioral check per prevenire uso improprio
- [ ] Test per verifica derivabilita alias da root identity

**Metriche di Successo**  
- KPI: Sync multi-device
- Soglia: <100ms latenza media; 99% successo sync
- Misurazione: Monitoring dashboard + alert automatici

**Note di Escalation**  
Escalation se: alias non sincronizzati tra device per >24h, violazione SB-012, confusione identita rilevata.

---

### [F2-1.3] Anti-Sybil con ZK Proofs e Behavioral Verification

**Descrizione**  
Implementare sistema anti-sybil compatibile con UX, con rate limit, behavioral verification e ZK proofs per proof-of-human. La frizione massima deve essere definita e verificabile; non deve trasformarsi in piattaforma di compliance.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-013 (Anti-sybil compatibile UX)

**Rischio Audit Ostile**  
- Audit #3 — Tecniche aggirabili; mitigato con ZK proofs + rate limit + behavioral checks

**Ambito Tecnico**  
Identity / Server / Cryptography

**Dipendenze**  
- F2-1.1 (Root Identity)
- Libreria ZK proofs (es. circom, snarkjs)

**Done When (Acceptance Criteria)**  
- [ ] Rate limit configurabile per creazione account/alias
- [ ] Behavioral verification basata su pattern interazione
- [ ] ZK proof-of-human implementato; verifica senza rivelare dati personali
- [ ] Soglia massima frizione definita e documentata (es. max 2 step aggiuntivi)
- [ ] Test per verifica efficacia anti-sybil senza degradare UX
- [ ] Logging per tentativi di aggiramento

**Metriche di Successo**  
- KPI: Conformita STEP B
- Soglia: 100% vincoli rispettati; frizione < soglia massima
- Misurazione: Monitoring + user feedback

**Note di Escalation**  
Escalation se: tentativi di aggiramento >10% utenti, frizione supera soglia massima, frodi/abusi rilevati.

---

### [F2-1.4] Accesso Multi-Dispositivo con Sync Offline-First

**Descrizione**  
Implementare sistema di accesso multi-dispositivo con sincronizzazione sicura tra device. Sync deve essere offline-first, con fallback edge se latenza >100ms, e preservare continuita relazionale.

**Fase**  
FASE 2

**Priorita**  
P0

**Vincoli STEP B**  
- SB-024 (Accesso multi-dispositivo)
- SB-011 (Root identity non eliminabile)

**Rischio Audit Ostile**  
- Audit #4 — Sync fallisce; mitigato con test offline-first e fallback edge

**Ambito Tecnico**  
Identity / Server / Edge / Sync

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema edge/serverless (F2-2.3)

**Done When (Acceptance Criteria)**  
- [ ] Autenticazione multi-device con token sicuri
- [ ] Sync offline-first; dati locali disponibili senza connessione
- [ ] Fallback edge automatico se latenza >100ms
- [ ] Risoluzione conflitti sync senza perdita dati
- [ ] Test stress per sync in condizioni di rete degradata
- [ ] Monitoring latenza sync; alert se >100ms

**Metriche di Successo**  
- KPI: Sync multi-device
- Soglia: <100ms latenza media; 99% successo sync
- Misurazione: Dashboard monitoring + alert automatici

**Note di Escalation**  
Escalation automatica se: latenza sync >100ms per >10 min, perdita dati rilevata, sync fallisce per >5% utenti.

---

### [F2-1.5] Inviti Liberi + Referral Controllato Anti-Fraud

**Descrizione**  
Implementare sistema di inviti liberi con referral controllato. Referral deve essere anti-fraud (ZK proofs), bonus solo su interazioni reali verificate, nessun beneficio legato a volume.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-025 (Inviti liberi + referral controllato)
- SB-002 (No spam economy)

**Rischio Audit Ostile**  
- Audit #5 — Referral fraudolenti; mitigato con anti-fraud ZK e metriche qualita

**Ambito Tecnico**  
Identity / Business Logic / Cryptography

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema anti-sybil (F2-1.3)

**Done When (Acceptance Criteria)**  
- [ ] Inviti liberi senza restrizioni artificiali
- [ ] Referral tracking con ZK proofs per verifica interazioni reali
- [ ] Bonus solo su interazioni verificate (non su volume)
- [ ] Anti-fraud detection per referral multipli o pattern sospetti
- [ ] Test per verifica efficacia anti-fraud
- [ ] Logging per audit referral e bonus

**Metriche di Successo**  
- KPI: Conformita STEP B
- Soglia: 100% vincoli rispettati; 0% referral fraudolenti
- Misurazione: Monitoring + audit periodici

**Note di Escalation**  
Escalation se: referral fraudolenti >5%, crescita artificiale rilevata, violazione SB-002.

---

### [F2-1.6] Discovery Attiva con Opt-In Obbligatorio

**Descrizione**  
Implementare sistema di discovery attiva per raccomandazioni community e utenti. Discovery deve essere opt-in obbligatorio, privacy-respecting, con controlli audit per prevenire privacy leaks.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-026 (Discovery attiva)
- SB-004 (Diritto all'oblio)

**Rischio Audit Ostile**  
- Audit #6 — Privacy leak; mitigato con opt-in obbligatorio e controlli audit

**Ambito Tecnico**  
Identity / Client / Privacy

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema privacy (F2-2.4)

**Done When (Acceptance Criteria)**  
- [ ] Opt-in obbligatorio per discovery; default disattivo
- [ ] Raccomandazioni privacy-respecting; nessun dato personale esposto
- [ ] Controlli audit per ogni accesso a dati discovery
- [ ] Revoca opt-in immediata e completa
- [ ] Test per verifica assenza privacy leaks
- [ ] Dashboard trasparenza per utente (cosa e condiviso)

**Metriche di Successo**  
- KPI: Discovery opt-in
- Soglia: >=60% opt-in; 0% privacy leaks
- Misurazione: Analytics + audit periodici

**Note di Escalation**  
Escalation automatica se: opt-in violato, privacy leak rilevato, violazione SB-004.

---

### [F2-1.7] Associazione Root Identity ↔ Wallet Unico

**Descrizione**  
Implementare mapping crittografico tra root identity e wallet unico. Mapping deve essere privacy-preserving, non trasferibile, e supportare operazioni senza rivelare identita.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-027 (Root identity ↔ wallet unico)
- SB-011 (Root identity non eliminabile)

**Rischio Audit Ostile**  
- Audit #1 — Correlazione indebita; mitigato con mapping crittografico privacy-preserving

**Ambito Tecnico**  
Identity / Storage / Cryptography

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema wallet (se presente in MVP)

**Done When (Acceptance Criteria)**  
- [ ] Mapping crittografico root identity ↔ wallet; non reversibile senza autorizzazione
- [ ] Privacy-preserving: operazioni wallet non rivelano root identity
- [ ] Mapping non trasferibile; legato a root identity specifica
- [ ] Test per verifica privacy-preserving
- [ ] Documentazione mapping e operazioni supportate
- [ ] Log audit per operazioni mapping

**Metriche di Successo**  
- KPI: Privacy Compliance
- Soglia: 100% task on-device; 0% leaks auditati
- Misurazione: Audit periodici + monitoring

**Note di Escalation**  
Escalation se: correlazione indebita rilevata, privacy leak, violazione SB-027.

---

### [F2-2.1] Reputazione Composita Non Trasferibile

**Descrizione**  
Implementare sistema di reputazione composita per-community, non trasferibile tra community. Reputazione deve essere locale, non aggregabile globalmente, e legata a root identity verificata.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-016 (Reputazione non trasferibile)
- SB-011 (Root identity non eliminabile)

**Rischio Audit Ostile**  
- Audit #9 (FASE 1) — Duplicazione identita; mitigato con reputazione legata solo a root identity verificata

**Ambito Tecnico**  
Community / Business Logic / Storage

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema community (FASE 1)

**Done When (Acceptance Criteria)**  
- [ ] Reputazione calcolata per-community; non aggregabile cross-community
- [ ] Reputazione legata solo a root identity verificata
- [ ] Nessun trasferimento di segnali tra community
- [ ] Test per verifica isolamento reputazione tra community
- [ ] API per consultazione reputazione locale
- [ ] Logging per audit calcolo reputazione

**Metriche di Successo**  
- KPI: Conformita STEP B
- Soglia: 100% vincoli rispettati; 0% aggregazioni cross-community
- Misurazione: Code review + audit periodici

**Note di Escalation**  
Escalation se: aggregazioni cross-community rilevate, reputazione globale implicita, violazione SB-016.

---

### [F2-2.2] Social Coach On-Device con Guardrails Anti-Isolamento

**Descrizione**  
Implementare Social Coach on-device con modelli LLM quantizzati locali, nudges non prescrittivi, opt-out esplicito, e guardrails per prevenire overuse AI (>60% conversazioni mediate).

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-022 (Social Coach on-device)
- SB-017 (AI opt-in)
- SB-018 (Social Coach opzionale)
- SB-019 (AI non mediatore)

**Rischio Audit Ostile**  
- Audit #14 (FASE 1) — Overuse AI; mitigato con limiti "Human Touch" e reminder

**Ambito Tecnico**  
AI / Client / On-Device

**Dipendenze**  
- Sistema AI opt-in (FASE 1)
- Modelli LLM quantizzati (es. Phi-3.5-mini)

**Done When (Acceptance Criteria)**  
- [ ] Modelli LLM quantizzati on-device; inferenza locale
- [ ] Nudges non prescrittivi; solo descrizioni contestuali
- [ ] Opt-out esplicito e immediato; core funziona senza coach
- [ ] Guardrails anti-isolamento: reminder "Human Touch" se >60% conversazioni mediate
- [ ] Metriche Human Touch Rate; alert se <70%
- [ ] Test per verifica core indipendente da coach

**Metriche di Successo**  
- KPI: Human Touch Rate
- Soglia: 70-80% interazioni umane dirette
- Misurazione: Monitoring settimanale + alert automatici

**Note di Escalation**  
Escalation automatica se: overuse AI >60%, Human Touch Rate <70%, violazione SB-019.

---

### [F2-2.3] Edge/Serverless Fallback con Stress Test

**Descrizione**  
Implementare sistema edge/serverless come fallback per operazioni critiche. Fallback deve attivarsi automaticamente se latenza >100ms, supportare offline-first, e essere stress-testato.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-024 (Accesso multi-dispositivo)
- SB-005 (Proprieta del dato)

**Rischio Audit Ostile**  
- Audit #15 (FASE 1) — Latenza in fallback; mitigato con priorita on-device e stress test edge

**Ambito Tecnico**  
Edge / Serverless / Infrastructure

**Dipendenze**  
- Sistema sync multi-device (F2-1.4)
- Infrastruttura edge (es. Cloudflare Workers)

**Done When (Acceptance Criteria)**  
- [ ] Fallback edge automatico se latenza >100ms
- [ ] Priorita on-device; edge solo come fallback
- [ ] Stress test edge per carico massimo previsto
- [ ] Monitoring latenza fallback; alert se >100ms per >10 min
- [ ] Test offline-first; funzionamento senza connessione
- [ ] Documentazione architettura edge/on-device

**Metriche di Successo**  
- KPI: Sync multi-device
- Soglia: <100ms latenza media; 99% successo sync
- Misurazione: Dashboard monitoring + alert automatici

**Note di Escalation**  
Escalation automatica se: latenza fallback >100ms per >10 min, perdita offline-first, violazione SB-005.

---

### [F2-2.4] Privacy & Zero-Knowledge Guarantees

**Descrizione**  
Implementare garanzie privacy e zero-knowledge per operazioni sensibili. Dati relazionali devono essere sotto controllo utente, on-device default, con ZK proofs dove necessario.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-004 (Diritto all'oblio)
- SB-005 (Proprieta del dato)
- SB-026 (Discovery attiva)

**Rischio Audit Ostile**  
- Audit #6 — Privacy leak; mitigato con opt-in obbligatorio e controlli audit

**Ambito Tecnico**  
Privacy / Cryptography / Storage

**Dipendenze**  
- F2-1.1 (Root Identity)
- Sistema discovery (F2-1.6)

**Done When (Acceptance Criteria)**  
- [ ] Zero-knowledge proofs per operazioni sensibili
- [ ] Dati relazionali on-device default; cloud solo con consenso esplicito
- [ ] Cancellazione effettiva dati personali; separazione continuita relazionale
- [ ] Portabilita completa stati/ruoli/contesti senza perdita semantica
- [ ] Test per verifica privacy-preserving
- [ ] Audit logging per accesso dati sensibili

**Metriche di Successo**  
- KPI: Privacy Compliance
- Soglia: 100% task on-device default; 0% leaks auditati
- Misurazione: Audit periodici + monitoring

**Note di Escalation**  
Escalation automatica se: privacy leak rilevato, violazione SB-004 o SB-005, opt-in violato.

---

### [F2-2.5] Interoperabilita Bridge Matrix-Based

**Descrizione**  
Implementare bridge Matrix-based per interoperabilita con WhatsApp/Telegram/Signal. Bridge deve essere solo migrazione, non alterare il core, e supportare spostamento graduale contatti.

**Fase**  
FASE 2

**Priorita**  
P2

**Vincoli STEP B**  
- SB-023 (Interoperabilita Matrix-based)
- SB-021 (Allineamento Core Condiviso)

**Rischio Audit Ostile**  
- Audit #8 (FASE 1) — DM bypassano community; mitigato con bridge che preserva contesto

**Ambito Tecnico**  
Bridge / Integration / Matrix Protocol

**Dipendenze**  
- Core relazionale (FASE 1)
- Matrix SDK (es. matrix-js-sdk)

**Done When (Acceptance Criteria)**  
- [ ] Bridge Matrix implementato; connessione a server Matrix
- [ ] Bridge non altera core; solo layer di traduzione
- [ ] Spostamento graduale contatti; migrazione senza perdita contesto
- [ ] Test per verifica isolamento bridge dal core
- [ ] Documentazione bridge e limiti interoperabilita
- [ ] Logging per operazioni bridge

**Metriche di Successo**  
- KPI: Conformita STEP B
- Soglia: 100% vincoli rispettati; core non modificato
- Misurazione: Code review + test integrazione

**Note di Escalation**  
Escalation se: bridge altera core, violazione SB-021, perdita contesto in migrazione.

---

### [F2-3.1] Monitoring KPI + Alert Automatici

**Descrizione**  
Implementare sistema di monitoring KPI FASE 2 con alert automatici. Dashboard deve mostrare KPI in tempo reale, alert attivati automaticamente se sotto soglia, e integrazione con escalation.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- Tutti i vincoli STEP B (monitoring conformita)

**Rischio Audit Ostile**  
- Tutti i rischi Audit Ostile (monitoring mitigazione)

**Ambito Tecnico**  
Monitoring / Infrastructure / Dashboard

**Dipendenze**  
- Tutti gli item FASE 2 (per metriche)

**Done When (Acceptance Criteria)**  
- [ ] Dashboard KPI FASE 2: Human Touch Rate, Sync multi-device, Discovery opt-in, Privacy Compliance
- [ ] Alert automatici se KPI sotto soglia minima
- [ ] Integrazione con sistema escalation
- [ ] Logging metriche per audit
- [ ] Test per verifica alert automatici
- [ ] Documentazione dashboard e alert

**Metriche di Successo**  
- KPI: Conformita STEP B
- Soglia: 100% vincoli rispettati; alert attivi
- Misurazione: Dashboard + audit periodici

**Note di Escalation**  
Escalation automatica se: KPI sotto soglia per >24h, alert non attivati, violazioni STEP B non rilevate.

---

### [F2-3.2] Hardening Sicurezza e Audit Logging

**Descrizione**  
Implementare hardening sicurezza e audit logging completo. Log devono essere immutabili, tracciabili, e supportare audit esterni. Sicurezza deve prevenire attacchi comuni e proteggere dati sensibili.

**Fase**  
FASE 2

**Priorita**  
P1

**Vincoli STEP B**  
- SB-011 (Root identity non eliminabile)
- SB-004 (Diritto all'oblio)
- SB-006 (Trasparenza AI)

**Rischio Audit Ostile**  
- Audit #1 — Privacy compromessa; mitigato con hardening e audit logging

**Ambito Tecnico**  
Security / Logging / Audit

**Dipendenze**  
- Tutti gli item FASE 2 (per logging completo)

**Done When (Acceptance Criteria)**  
- [ ] Audit logging per ogni operazione critica; log immutabili
- [ ] Hardening sicurezza: protezione contro SQL injection, XSS, CSRF
- [ ] Crittografia dati sensibili; chiavi gestite sicuramente
- [ ] Test sicurezza: penetration testing, vulnerability scanning
- [ ] Documentazione sicurezza e procedure incident response
- [ ] Compliance con standard sicurezza (es. OWASP Top 10)

**Metriche di Successo**  
- KPI: Privacy Compliance
- Soglia: 100% task on-device; 0% leaks auditati; 0% vulnerabilita critiche
- Misurazione: Security audit + vulnerability scanning

**Note di Escalation**  
Escalation automatica se: vulnerabilita critica rilevata, privacy leak, log compromessi, violazione SB-004.

---

## 4. Riepilogo Copertura

### STEP B → Item Backlog

| Vincolo STEP B | Item Backlog | Stato Copertura |
|----------------|--------------|-----------------|
| SB-011 (Root identity non eliminabile) | F2-1.1, F2-1.4, F2-1.7, F2-2.1, F2-3.2 | ✅ Coperto |
| SB-012 (Alias come projection) | F2-1.2 | ✅ Coperto |
| SB-013 (Anti-sybil compatibile UX) | F2-1.3 | ✅ Coperto |
| SB-024 (Accesso multi-dispositivo) | F2-1.4, F2-2.3 | ✅ Coperto |
| SB-025 (Inviti liberi + referral controllato) | F2-1.5 | ✅ Coperto |
| SB-026 (Discovery attiva) | F2-1.6, F2-2.4 | ✅ Coperto |
| SB-027 (Root identity ↔ wallet unico) | F2-1.7 | ✅ Coperto |
| SB-016 (Reputazione non trasferibile) | F2-2.1 | ✅ Coperto |
| SB-022 (Social Coach on-device) | F2-2.2 | ✅ Coperto |
| SB-017 (AI opt-in) | F2-2.2 | ✅ Coperto |
| SB-018 (Social Coach opzionale) | F2-2.2 | ✅ Coperto |
| SB-019 (AI non mediatore) | F2-2.2 | ✅ Coperto |
| SB-023 (Interoperabilita Matrix-based) | F2-2.5 | ✅ Coperto |
| SB-004 (Diritto all'oblio) | F2-2.4, F2-3.2 | ✅ Coperto |
| SB-005 (Proprieta del dato) | F2-2.3, F2-2.4 | ✅ Coperto |

### Audit Ostile → Item Backlog

| Rischio Audit Ostile | Item Backlog | Mitigazione |
|---------------------|--------------|-------------|
| Audit #1 — Alias aggirano vincolo | F2-1.1, F2-1.7 | Separazione crittografica, controlli SSI |
| Audit #2 — Uso improprio alias | F2-1.2 | Limitazioni temporanee, behavioral check |
| Audit #3 — Tecniche aggirabili | F2-1.3 | ZK proofs, rate limit, behavioral checks |
| Audit #4 — Sync fallisce | F2-1.4, F2-2.3 | Test offline-first, fallback edge |
| Audit #5 — Referral fraudolenti | F2-1.5 | Anti-fraud ZK, metriche qualita |
| Audit #6 — Privacy leak | F2-1.6, F2-2.4 | Opt-in obbligatorio, controlli audit |
| Audit #14 — Overuse AI | F2-2.2 | Limiti "Human Touch", reminder |
| Audit #15 — Latenza fallback | F2-2.3 | Priorita on-device, stress test |

### KPI → Item Backlog

| KPI | Item Backlog | Misurazione |
|-----|--------------|-------------|
| Human Touch Rate (70-80%) | F2-2.2, F2-3.1 | Monitoring settimanale |
| Sync multi-device (<100ms) | F2-1.4, F2-2.3, F2-3.1 | Dashboard monitoring |
| Discovery opt-in (>=60%) | F2-1.6, F2-3.1 | Analytics + audit |
| Privacy Compliance (100%) | F2-2.4, F2-3.2 | Audit periodici |
| Conformita STEP B (100%) | Tutti gli item | CI/CD + code review |

---

**Backlog pronto per implementazione FASE 2.**  
**Ogni item e tracciabile a governance congelata e pronto per assegnazione team.**
