# IRIS — Workflow Operativo FASE 1 (Precompilato)
---

## 1. Obiettivi del Workflow
1. Verifica giornaliera dei vincoli STEP B.
2. Monitoraggio e aggiornamento Audit Ostile.
3. Raccolta e valutazione Early Adopter feedback.
4. Reporting vincolante mensile.
5. Template operativo precompilato per tutte le attivita.
6. Sezione escalation per issue critiche e violazioni STEP B.

---

## 2. Ruoli e Responsabilita
| Ruolo | Responsabilita principale |
|-------|---------------------------|
| Dev Team | Implementazione conforme STEP B, daily check-in |
| Lead Engineer | Aggiornamento Audit Ostile, supervisione tecnica |
| UX Analyst | Raccolta Early Adopter feedback, analisi dolori/residui |
| Principal Engineer | Validazione finale, decision-making vincolante |
| Product Owner | Coordinamento FASE 1, approvazioni e prioritizzazione |
| Escalation Officer | Gestione issue critiche, violazioni STEP B |

---

## 3. Template Precompilato delle Attivita

### 3.1 Daily Check-in STEP B
| Data | Vincolo STEP B | Stato ✅ / ⚠️ | Note / Log verificabile | Responsabile |
|------|----------------|---------------|------------------------|--------------|
| 24/01/2026 | Thread obbligatori | ✅ | Tutti i messaggi hanno thread validi | Dev Team |
| 24/01/2026 | Messaggi con stato e contesto | ⚠️ | Un client non valida il metadato di stato | Dev Team |
| 24/01/2026 | Root identity / alias | ✅ | Mapping coerente e tracciabile | Dev Team |
| 24/01/2026 | AI opt-in | ✅ | Opt-in esplicito verificato | Dev Team |

### 3.2 Audit Ostile Settimanale
| Settimana | Vincolo | Tipo di rischio | Impatto | Azione suggerita | Responsabile |
|-----------|---------|----------------|---------|-----------------|--------------|
| Week 4 | No dark pattern | Notifiche camuffate da informative | Riduzione fiducia | Vietare metriche di click-through | Lead Engineer |
| Week 4 | AI opt-in | Attivazione implicita | Violazione fiducia | Opt-in separato e revocabile | Lead Engineer |
| Week 4 | Chat infinita non primaria | Default lineare nel client | Perdita contesto | Bloccare flusso lineare non contestualizzato | Lead Engineer |

### 3.3 Early Adopter Feedback Bi-Settimanale
| Archetipo | Scenario | Dolore residuo | Successo | Note | Responsabile |
|-----------|---------|----------------|----------|------|--------------|
| Community Builder | Community con thread obbligatori | ⚠️ Onboarding ruoli/stati complesso | ✅ Thread organizzati, memoria consultabile | Monitorare frizione onboarding | UX Analyst |
| Creator multipiattaforma | Contesto unico per community principale | ⚠️ Frizione consolidamento audience | ✅ Continuita relazionale coerente | Verificare comunicazione onboarding | UX Analyst |
| Team informale | Thread per attivita e decisioni | ⚠️ Consenso AI per contesto percepito come overhead | ✅ Riduzione rumore | Misurare percezione opt-in | UX Analyst |

### 3.4 Reporting Mensile / Checkpoint FASE 1
| Mese | Vincoli STEP B verificati | Audit Ostile aggiornato | Early Adopter dolori / successi | Decisioni vincolanti | Responsabile |
|------|--------------------------|------------------------|-------------------------------|-------------------|--------------|
| Gennaio 2026 | Tutti tranne 1 ⚠️ | Tabella aggiornata con 2 rischi | Dolori residui documentati | Mitigazioni compatibili STEP B | Principal Engineer |

---

## 4. Sezione Escalation
| Tipo Issue | Trigger | Azione immediata | Escalazione | Responsabile |
|------------|--------|-----------------|------------|--------------|
| Violazione STEP B | Commit o PR non conforme | Bloccare merge, notifica team | Alert Principal Engineer e Product Owner | Escalation Officer |
| Rischio critico Early Adopter | Feedback ⚠️ / ❌ ricorrente | Analisi rapida, documentazione | Aggiornare Audit Ostile e procedure | Escalation Officer |
| Bug critico / Security | Crash o perdita dati | Hotfix immediato, log evento | Review Lead Engineer + Principal Engineer | Escalation Officer |

---

## 5. KPI e Monitoraggio (qualitativi e di conformita)
- **Continuita relazionale**: riuso di contesti e stati tra sessioni.
- **Riduzione del rumore**: diminuzione dei messaggi fuori contesto.
- **Adozione contesti**: percentuale di messaggi con stato valido.
- **Conformita STEP B**: percentuale vincoli rispettati in commit / PR.
- **Dolori Early Adopter**: numero di problemi segnalati e risolti.

---

## 6. Regole di Conduzione
- Tutte le modifiche devono essere tracciate e versionate.
- Nessun vincolo STEP B puo essere bypassato senza autorizzazione documentata.
- Ogni eccezione deve indicare motivazione, impatto e approvazione.
- Early Adopter feedback deve essere correlato a vincoli e audit.
- Audit Ostile aggiornato deve essere consultabile dal team in ogni momento.
- Ogni attivita deve produrre log verificabili per audit interno.
