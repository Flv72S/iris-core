# IRIS — Workflow Operativo FASE 1 (Precompilato)
---

## 1. Congelamento STEP B (Precompilato)
| # | Vincolo / Principio | Sezione | Stato | Note operative |
|---|-------------------|--------|-------|----------------|
| 1 | No dark pattern | Principi Etici | ✅ | Solo notifiche informative, metriche click-through proibite |
| 2 | No spam economy | Principi Etici | ✅ | Incentivi solo su qualita contributi e retention |
| 3 | IRIS = Protocollo di Relazione | USP | ✅ | Thread obbligatori, messaggi con stato |
| 4 | Thread obbligatori | Messaging | ✅ | Tutti i messaggi devono appartenere a thread |
| 5 | Messaggi con stato | Messaging | ✅ | Stato validato e obbligatorio per accettazione |
| 6 | Root identity non eliminabile | Identity | ✅ | Continuita separata da dati personali |
| 7 | Alias e pseudonimi | Identity | ✅ | Proiezioni tracciabili internamente |
| 8 | Anti-sybil compatibile UX | Identity | ✅ | Frizione massima definita e verificabile |
| 9 | Community come unita primaria | Community | ✅ | DM non contestuali non sono modalita primaria |
| 10 | Memoria consultiva | Community | ✅ | Memoria consultiva, non prescrittiva o punitiva |
| 11 | Reputazione composita | Community | ✅ | Nessuna reputazione globale o aggregata |
| 12 | AI opt-in | AI | ✅ | Consenso esplicito, specifico e revocabile |
| 13 | Social Coach opzionale | AI | ✅ | Layer separato, core indipendente |
| 14 | Scope MVP rispettato | Scope | ✅ | Campi non usati dall'MVP vietati |
| 15 | Allineamento Core Condiviso (Colibri) | Core | ✅ | Modifiche semantiche vietate |

---

## 2. Audit Ostile Reale (Atto 2) — Precompilato
| # | Vincolo | Tipo rischio | Impatto | Azione suggerita | Responsabile |
|---|---------|-------------|---------|-----------------|--------------|
| 1 | No dark pattern | Notifiche camuffate da informative | Riduzione fiducia | Vietare metriche click-through; audit finalita notifiche | Lead Engineer |
| 2 | No spam economy | Incentivi indiretti su inviti/volume | Crescita artificiale | Vietare benefici legati a inviti o volume | Lead Engineer |
| 3 | Protocollo di Relazione | Chat lineare reintrodotta come default | Perdita differenziazione | Vietare modalita primaria non contestualizzata | Lead Engineer |
| 4 | Thread obbligatori | Thread ignorati nel flusso | Caos mascherato | Thread come unita primaria navigabile | Lead Engineer |
| 5 | Messaggi con stato | Client non aggiorna metadati | Perdita consistenza | Rifiuto messaggi privi di stato/contesto | Lead Engineer |
| 6 | Root identity non eliminabile | Correlazione indebita root/alias | Rischio privacy | Separare continuita relazionale da dati personali | Lead Engineer |
| 7 | Alias e pseudonimi | Alias come identita autonome | Elusione responsabilita | Alias derivabile da root identity per audit | Lead Engineer |
| 8 | Anti-sybil | Frizione non definita | Abuso o compliance implicita | Definire soglia massima di frizione e criteri minimi | Lead Engineer |
| 9 | Community primaria | DM bypassano community | Perdita memoria condivisa | Vietare DM non contestuali come percorso primario | Lead Engineer |
| 10 | Memoria consultiva | Memoria usata come gating | Potere automatico implicito | Vietare uso memoria per abilitare/bloccare azioni | Lead Engineer |
| 11 | Reputazione composita | Aggregazioni cross-community | Reputazione globale implicita | Vietare aggregazioni o trasferimenti di segnali | Lead Engineer |
| 12 | AI opt-in | Opt-in implicito in onboarding | Violazione fiducia | Consenso esplicito e revocabile, default disattivo | Lead Engineer |
| 13 | Social Coach | Nudges percepiti prescrittivi | Abbandono utenti | Vietare linguaggio prescrittivo; coach disattivabile | Lead Engineer |
| 14 | Scope MVP | Elementi non MVP introdotti | Ritardo e deriva | Vietare campi/logiche non usate dall'MVP | Lead Engineer |
| 15 | Allineamento Core | Estensioni non autorizzate | Conflitto core | Elenco chiuso di stati/ruoli/transizioni immutabili | Lead Engineer |

---

## 3. Simulazione Early Adopter (Atto 3) — Precompilato

### Archetipi
| Archetipo | Obiettivo | Dolore attuale | Necessita risolutiva |
|-----------|-----------|---------------|---------------------|
| Community Builder | Gestire community coese | Chat caotiche, thread persi | Thread ordinati, memoria consultiva, governance semplice |
| Creator multipiattaforma | Coordinare audience frammentata | Dispersione su canali diversi | Contesto unico per messaggi e relazioni |
| Team informale cross-country | Collaborare in remoto | Chat disperse, perdita contesto | Identita fluida, messaggi con stato, contesto persistente |

### Scenario d'uso Archetipico 1 — Community Builder
- **Step principali**: 1) Creazione community; 2) Thread obbligatori con stato; 3) Memoria consultiva.
- **Dolori residui**: ⚠️ Onboarding ruoli/stati complesso.
- **Successi principali**: ✅ Messaggi ordinati; ✅ Memoria consultiva coerente.

### Scenario d'uso Archetipico 2 — Creator multipiattaforma
- **Step principali**: 1) Contesto unico per la community principale; 2) Conversazioni per tema; 3) Alias contestuali per ruoli diversi.
- **Dolori residui**: ⚠️ Frizione nel consolidare audience senza meccaniche di growth.
- **Successi principali**: ✅ Continuita relazionale; ✅ Riduzione dispersione.

### Scenario d'uso Archetipico 3 — Team Informale
- **Step principali**: 1) Definizione ruoli base; 2) Thread per decisioni; 3) AI opt-in contestuale.
- **Dolori residui**: ⚠️ Opt-in AI percepito come overhead.
- **Successi principali**: ✅ Messaggi con stato chiaro; ✅ Riduzione rumore.

---

## 4. Ruoli del Team
| Ruolo | Responsabilita principale |
|-------|---------------------------|
| Dev Team | Implementazione conforme STEP B, daily check-in |
| Lead Engineer | Aggiornamento Audit Ostile, supervisione tecnica |
| UX Analyst | Raccolta Early Adopter feedback, analisi dolori |
| Principal Engineer | Validazione finale, decision-making vincolante |
| Product Owner | Coordinamento FASE 1, approvazioni e prioritizzazione |
| Escalation Officer | Gestione issue critiche e violazioni STEP B |

---

## 5. Workflow Operativo Precompilato

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
| Week 4 | Chat lineare | Default non contestualizzato | Bloccare modalita primaria lineare | Lead Engineer |

### 5.3 Early Adopter Bi-Settimanale
| Archetipo | Dolore residuo | Successo | Note | Responsabile |
|-----------|----------------|----------|------|--------------|
| Community Builder | ⚠️ Onboarding ruoli/stati | ✅ Thread ordinati | Monitorare frizione | UX Analyst |
| Creator multipiattaforma | ⚠️ Frizione consolidamento audience | ✅ Continuita relazionale | Aggiornare materiale onboarding | UX Analyst |
| Team Informale | ⚠️ Opt-in AI percepito come overhead | ✅ Riduzione rumore | Monitorare percezione opt-in | UX Analyst |

### 5.4 Reporting Mensile / Checkpoint FASE 1
| Mese | Vincoli STEP B | Audit Ostile | Early Adopter | Decisioni vincolanti | Responsabile |
|------|----------------|--------------|---------------|-------------------|--------------|
| Gennaio 2026 | Tutti tranne 1 ⚠️ | Tabella aggiornata | Dolori residui documentati | Mitigazioni compatibili STEP B | Principal Engineer |

---

## 6. Sezione Escalation
| Tipo Issue | Trigger | Azione immediata | Escalazione | Responsabile |
|------------|--------|-----------------|------------|--------------|
| Violazione STEP B | Commit/PR non conforme | Bloccare merge, notifica team | Principal Engineer + Product Owner | Escalation Officer |
| Rischio Early Adopter critico | Feedback ⚠️/❌ ricorrente | Analisi rapida | Aggiornare Audit Ostile | Escalation Officer |
| Bug critico/Security | Crash o perdita dati | Hotfix immediato, log evento | Review Lead Engineer + Principal Engineer | Escalation Officer |

---

## 7. KPI e Monitoraggio (con esempi numerici)
| KPI | Valore attuale (esempio) | Soglia operativa | Nota di conformita |
|-----|--------------------------|------------------|--------------------|
| Continuita relazionale | 62% contesti riutilizzati entro 14 giorni | >= 60% | Misurato per community, non per utente globale |
| Riduzione del rumore | 28% messaggi fuori contesto | <= 30% | Ogni messaggio fuori contesto genera alert |
| Adozione contesti | 94% messaggi con stato valido | >= 95% | Stato obbligatorio per accettazione |
| Conformita STEP B | 13/15 vincoli ✅, 2 ⚠️ | 15/15 ✅ | ⚠️ richiede decisione architetturale |
| Dolori Early Adopter | 7 segnalati / 3 risolti nel ciclo | >= 50% risolti | Collegati a righe Audit Ostile |

---

## 8. Sintesi Finale
- **Dolori principali**: onboarding strutturato, opt-in AI percepito come overhead.
- **Dolori da mitigare senza violare STEP B**: migliorare chiarezza onboarding e trasparenza opt-in AI.
- **Successi principali**: thread obbligatori, messaggi con stato, memoria consultiva, riduzione rumore.
- **Decisioni vincolanti**:
  - Nessuna deviazione dai vincoli STEP B senza eccezione documentata.
  - Audit Ostile aggiornato e tracciabile in ogni ciclo.
  - Early Adopter feedback sempre correlato ai vincoli.
