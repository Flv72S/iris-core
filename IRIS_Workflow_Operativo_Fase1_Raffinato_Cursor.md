# IRIS Workflow FASE 1 v2.0 (Raffinato 10/10)

> Documento operativo vincolante per la FASE 1 di IRIS.  
> Uso in Cursor: incolla in file `.md` e applica refine iterativo.  
> Versione raffinata per scalabilita, privacy-first e AI on-device.

---

## 1. Congelamento STEP B (Precompilato con espansioni)
| # | Vincolo / Principio | Sezione | Stato | Note operative |
|---|-------------------|--------|-------|----------------|
| 1 | No dark pattern | Principi Etici | ✅ | Solo notifiche informative; metriche click-through proibite; reminder "Human Touch" soft |
| 2 | No spam economy | Principi Etici | ✅ | Incentivi su qualita contributi e retention; bonus solo su interazioni umane verificate |
| 3 | IRIS = Protocollo di Relazione | USP | ✅ | Thread obbligatori; messaggi con stato; Social Coach solo supporto |
| 4 | Thread obbligatori | Messaging | ✅ | Tutti i messaggi devono appartenere a thread; visualizzazione gerarchica |
| 5 | Messaggi con stato | Messaging | ✅ | Stato validato lato edge/server; sincronizzazione offline-first |
| 6 | Root identity non eliminabile | Identity | ✅ | Separazione crittografica root/alias; SSI per sovranita dati |
| 7 | Alias e pseudonimi | Identity | ✅ | Proiezioni tracciabili internamente; alias per contesto, non identita autonome |
| 8 | Anti-sybil compatibile UX | Identity | ✅ | Rate limit + behavioral verification; ZK proof per proof-of-human |
| 9 | Community come unita primaria | Community | ✅ | DM non contestuali non sono modalita primaria; hub interoperabile |
| 10 | Memoria consultiva | Community | ✅ | Timeline consultiva; sintesi AI on-device; nessun gating |
| 11 | Reputazione composita | Community | ✅ | Reputazione locale; ZK per privacy; nessuna aggregazione globale |
| 12 | AI opt-in | AI | ✅ | Opt-in separato e revocabile; default on-device |
| 13 | Social Coach opzionale | AI | ✅ | Linguaggio descrittivo; opt-out esplicito; modelli quantizzati locali |
| 14 | Scope MVP rispettato | Scope | ✅ | Freeze scope hard; escluso AI cloud-heavy |
| 15 | Allineamento Core Condiviso (Colibri) | Core | ✅ | Modifiche semantiche vietate; policy edge-compatible |
| 16 | Social Coach on-device | AI | ✅ | LLM quantizzati locali; nudges non prescrittivi; opt-out immediato |
| 17 | Interoperabilita Matrix-based | Bridge | ✅ | Bridge verso canali esterni solo come migrazione; non altera il core |

---

## 2. Audit Ostile Reale (Atto 2) — Precompilato con espansioni
| # | Vincolo | Tipo rischio | Impatto | Azione suggerita | Responsabile |
|---|---------|-------------|---------|-----------------|--------------|
| 1 | No dark pattern | Notifiche camuffate da informative | Riduzione fiducia | Bloccare metriche click-through; audit finalita notifiche | Lead Engineer |
| 2 | No spam economy | Incentivi indiretti su inviti/volume | Crescita artificiale | Vietare benefici legati a inviti o volume | Lead Engineer |
| 3 | Protocollo di Relazione | Chat lineare reintrodotta come default | Perdita differenziazione | Vietare modalita primaria non contestualizzata | Lead Engineer |
| 4 | Thread obbligatori | Thread ignorati nel flusso | Caos mascherato | Thread come unita primaria navigabile | Lead Engineer |
| 5 | Messaggi con stato | Client non aggiorna metadati | Perdita consistenza | Rifiuto messaggi privi di stato/contesto | Lead Engineer |
| 6 | Root identity non eliminabile | Correlazione indebita root/alias | Rischio privacy | Separare continuita relazionale da dati personali | Lead Engineer |
| 7 | Anti-sybil | Tecniche leggere aggirabili | Frodi / abusi | Rate limit + behavioral checks; ZK proofs | Lead Engineer |
| 8 | Community primaria | DM bypassano community | Perdita memoria condivisa | Limitare DM non contestuali; logging obbligatorio | Lead Engineer |
| 9 | Reputazione composita | Duplicazione identita | Score distorto | Solo root identity verificata; ZK for reputation | Lead Engineer |
| 10 | AI opt-in | Opt-in implicito | Violazione fiducia | Opt-in separato e revocabile; dashboard trasparenza | Lead Engineer |
| 11 | Social Coach | Nudges prescrittivi | Abbandono utenti | Linguaggio descrittivo; opt-out immediato | UX Analyst |
| 12 | Scope MVP | Feature premature | Ritardo deploy | Freeze scope con checklist hard; no AI cloud | Lead Engineer |
| 13 | Allineamento Core | Estensioni non autorizzate | Conflitto core | Bloccare modifiche core + logging; policy.json | Lead Engineer |
| 14 | Social Coach | Overuse AI > 60% | Isolamento utenti | Limiti "Human Touch"; soglia % interazioni umane | UX Analyst |
| 15 | Edge/Serverless | Latenza in fallback | Perdita offline-first | Priorita on-device; stress test edge; fallback P2P | DevOps Expert |

---

## 3. Simulazione Early Adopter (Atto 3) — Precompilato con Coach

### Archetipi
| Archetipo | Obiettivo | Dolore attuale | Necessita risolutiva |
|-----------|-----------|---------------|---------------------|
| Community Builder | Gestire community coese | Chat caotiche, thread persi | Thread ordinati, memoria consultiva, moderazione semplice, coach empatico |
| Creator multipiattaforma | Coordinare audience frammentata | Dispersione su canali diversi | Contesto unico per relazioni, interoperabilita controllata |
| Team informale cross-country | Collaborare in remoto | Chat disperse, perdita contesto | Identita fluida, messaggi con stato, coach post-interazione |

### Scenario d'uso Archetipico 1 — Community Builder
- **Step principali**: 1) Crea community con ruoli; 2) Thread con stato; 3) Memoria consultiva.
- **Dolori residui**: ⚠️ Onboarding ruoli/stati complesso; ⚠️ battery drain on-device in sessioni lunghe.
- **Successi principali**: ✅ Messaggi ordinati; ✅ continuita relazionale; ✅ coach aumenta empatia percepita.

### Scenario d'uso Archetipico 2 — Creator multipiattaforma
- **Step principali**: 1) Contesto unico; 2) Conversazioni per tema; 3) Alias contestuali.
- **Dolori residui**: ⚠️ Frizione consolidamento audience senza meccaniche di growth.
- **Successi principali**: ✅ Contesto coerente; ✅ riduzione dispersione; ✅ nudges utili ma non prescrittivi.

### Scenario d'uso Archetipico 3 — Team Informale
- **Step principali**: 1) Ruoli base; 2) Thread per decisioni; 3) AI opt-in contestuale.
- **Dolori residui**: ⚠️ Opt-in AI percepito come overhead; ⚠️ latenza edge in zone con bassa connettivita.
- **Successi principali**: ✅ Decisioni tracciabili; ✅ riduzione rumore; ✅ supporto AI trasparente.

---

## 4. Ruoli del Team (esteso)
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

---

## 5. Workflow Operativo Precompilato (con cronoprogramma IRIS)

### 5.0 Allineamento Cronoprogramma IRIS (FASE 1-11)
| Fase | Focus | Check operativo |
|------|-------|----------------|
| FASE 1 | Core relazionale | Conformita STEP B, thread e stato obbligatori |
| FASE 2 | Identita/SSI | Root identity, alias projection, ZK proof |
| FASE 3 | Community | Memoria consultiva, reputazione locale |
| FASE 4 | Interoperabilita | Bridge Matrix-based senza alterare core |
| FASE 5 | Governance soft | Regole esplicite e verificabili |
| FASE 6 | UX refinement | Riduzione attriti senza violare STEP B |
| FASE 7 | Edge/P2P | Hybrid P2P + serverless fallback |
| FASE 8 | Privacy hardening | ZK reputation, data minimization |
| FASE 9 | AI/Coach | On-device, opt-in, guardrails anti-isolamento |
| FASE 10 | Hardening | Test resilienza, security e offline-first |
| FASE 11 | Release gate | Checklist vincolante e go/no-go |

### 5.1 Daily Check-in STEP B
| Data | Vincolo | Stato ✅/⚠️ | Note | Responsabile |
|------|---------|-------------|------|--------------|
| 24/01/2026 | Thread obbligatori | ✅ | Tutti i messaggi appartengono a thread | Dev Team |
| 24/01/2026 | Messaggi con stato | ⚠️ | Un client non valida metadato di stato | Dev Team |
| 24/01/2026 | Identity root/alias | ✅ | Mapping coerente | Dev Team |
| 24/01/2026 | AI opt-in | ✅ | Opt-in esplicito verificato | Dev Team |

### 5.2 Audit Ostile Settimanale
| Settimana | Vincolo | Tipo rischio | Azione | Responsabile |
|-----------|---------|-------------|--------|--------------|
| Week 4 | No dark pattern | Notifiche camuffate | Bloccare metriche click-through | Lead Engineer |
| Week 4 | AI opt-in | Attivazione implicita | Opt-in separato e revocabile | Lead Engineer |
| Week 4 | Edge latency | Fallback degradato | Test edge + on-device priority | DevOps Expert |

### 5.3 Early Adopter Bi-Settimanale
| Archetipo | Dolore residuo | Successo | Note | Responsabile |
|-----------|----------------|----------|------|--------------|
| Community Builder | ⚠️ Onboarding ruoli/stati | ✅ Governance chiara | Misurare frizione | UX Analyst |
| Creator multipiattaforma | ⚠️ Frizione consolidamento audience | ✅ Continuita relazionale | Aggiornare materiale onboarding | UX Analyst |
| Team Informale | ⚠️ Opt-in AI overhead | ✅ Riduzione rumore | Monitorare percezione opt-in | UX Analyst |

### 5.4 Reporting Mensile / Checkpoint FASE 1
| Mese | Vincoli STEP B | Audit Ostile | Early Adopter | Decisioni vincolanti | Responsabile |
|------|----------------|--------------|---------------|-------------------|--------------|
| Gennaio 2026 | Tutti tranne 1 ⚠️ | Tabella aggiornata | Dolori residui documentati | Mitigazioni compatibili STEP B | Principal Engineer |

---

## 6. Sezione Escalation (operativa)
| Tipo Issue | Trigger | Azione immediata | Escalazione | Responsabile |
|------------|--------|-----------------|------------|--------------|
| Violazione STEP B | Commit/PR non conforme | Bloccare merge, notifica team | Principal Engineer + Product Owner | Escalation Officer |
| Overuse AI | >60% nudges AI accettati per sessione | Freeze nudges, audit immediato | AI Specialist + Principal Engineer | Escalation Officer |
| Edge Failure | Latenza > 800ms per 10 min | Forzare on-device, degradare funzionalita | DevOps Expert + Lead Engineer | Escalation Officer |
| Privacy Leak | Log con dati non autorizzati | Blocco pipeline, audit data access | Principal Engineer + DevOps Expert | Escalation Officer |
| Bug critico/Security | Crash o perdita dati | Hotfix immediato, log evento | Lead Engineer + Principal Engineer | Escalation Officer |

---

## 7. KPI e Monitoraggio (con esempi numerici e soglie)
| KPI | Valore attuale (esempio) | Soglia operativa | Nota di conformita |
|-----|--------------------------|------------------|--------------------|
| Human Touch Rate | 74% interazioni umane | 70-80% | Anti-isolamento obbligatorio |
| AI Engagement | 58% nudges utili | 50-70% | Superamenti richiedono review |
| Privacy Compliance | 100% on-device default | 100% | Cloud usage vietato per default |
| Continuita relazionale | 62% contesti riutilizzati entro 14 giorni | >= 60% | Misurato per community |
| Riduzione del rumore | 28% messaggi fuori contesto | <= 30% | Alert automatico per outlier |
| Adozione contesti | 94% messaggi con stato valido | >= 95% | Stato obbligatorio per accettazione |
| Conformita STEP B | 13/17 vincoli ✅, 4 ⚠️ | 17/17 ✅ | ⚠️ richiede decisione architetturale |

---

## 8. Sintesi Finale (vincolante)
- **Dolori principali**: onboarding strutturato, opt-in AI percepito come overhead, battery drain on-device.
- **Dolori da mitigare senza violare STEP B**: chiarezza onboarding, trasparenza opt-in AI, ottimizzazione consumo energetico.
- **Successi principali**: thread obbligatori, stato esplicito, memoria consultiva, empatia amplificata.
- **Decisioni vincolanti**:
  - Freeze scope con AI guardrails; nessuna deviazione senza eccezione documentata.
  - Audit Ostile aggiornato e tracciabile in ogni ciclo.
  - Early Adopter feedback sempre correlato ai vincoli.

---

**Prompt pronto per Cursor**: seleziona tutto e usa un comando di refine.  
Esempio: "Raffina questo workflow IRIS incorporando decentralizzazione, Social Coach on-device e metriche anti-isolamento per scalabilita MVP".
