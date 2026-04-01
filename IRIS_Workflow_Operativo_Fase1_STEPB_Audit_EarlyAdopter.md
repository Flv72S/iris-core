# IRIS — Workflow Operativo FASE 1 (STEP B + Audit Ostile + Early Adopter)
---

## 1. Daily Check-in Vincoli STEP B
**Obiettivo**: garantire conformita quotidiana ai vincoli non negoziabili.

**Attivita giornaliere**:
- Verifica che tutte le modifiche committate rispettino STEP B e Documento Finale di Controllo.
- Controllo minimo sui vincoli ad alto impatto:
  - Thread obbligatori.
  - Messaggi con stato e contesto.
  - Identita (root identity, alias come projection, anti-sybil).
  - AI opt-in e Social Coach opzionale.
- Classificazione esito: ✅ Conforme / ⚠️ Richiede decisione architetturale.

**Strumenti**:
- Pipeline CI/CD con controlli di conformita.
- Validazioni automatiche per vincoli core.

**Output giornaliero**:
- Log vincoli con esito per ogni voce.
- Evidenza di eventuali eccezioni documentate e versionate.

---

## 2. Audit Ostile Continuo
**Obiettivo**: mantenere aggiornate le ambiguita e i rischi emersi durante lo sviluppo.

**Attivita settimanali**:
- Rilettura e aggiornamento tabella Audit Ostile (Atto 2).
- Identificazione di nuove ambiguita o scappatoie.
- Classificazione impatto: alto / medio / basso.
- Aggiornamento dei suggerimenti normativi, senza modificare STEP B.

**Output settimanale**:
- Tabella Audit Ostile aggiornata e versionata.
- Log delle variazioni e motivazioni.

---

## 3. Early Adopter Feedback Loop
**Obiettivo**: misurare dolori e successi senza violare i vincoli STEP B.

**Attivita bi-settimanali**:
- Raccolta feedback dagli archetipi early adopter.
- Valutazione attriti: ✅ Accettabile / ⚠️ Migliorabile / ❌ Non accettabile.
- Confronto con vincoli STEP B e Audit Ostile.
- Identificazione di interventi operativi/UX compatibili con STEP B (senza introdurre feature).

**Output bi-settimanale**:
- Report Early Adopter con mappa dolori/successi.
- Tracciabilita per vincoli e righe della tabella Audit.

---

## 4. Reporting e Decision-Making
**Obiettivo**: consolidare stato e prendere decisioni vincolanti.

**Attivita mensili**:
- Consolidamento di:
  - Stato conformita STEP B.
  - Audit Ostile aggiornato.
  - Early Adopter feedback.
- Sessione di revisione con Principal Engineer e Product Owner.
- Decisioni consentite:
  - Mitigazioni operative compatibili con STEP B.
  - Aggiornamenti di procedure e checklist.
  - Nessuna modifica a STEP B senza eccezione documentata.

**Output mensile**:
- Documento "Checkpoint FASE 1 — Status Vincolante".
- Registro decisioni e azioni correttive.

---

## 5. Integrazione Strumenti
**Obiettivo**: garantire tracciabilita e auditabilità.

- **CI/CD pipeline**: verifica vincoli STEP B su commit e PR.
- **Jira / Linear**: tracciamento task con riferimento a vincoli STEP B e righe Audit Ostile.
- **Notion / Wiki**: repository dei documenti normativi, Audit Ostile e report Early Adopter.
- **Dashboard KPI**: monitoraggio qualitativo (continuita relazionale, riduzione rumore, adozione contesti).

---

## 6. Template Operativo (giornaliero / settimanale / mensile)

| Frequenza | Attivita | Responsabile | Output | Strumento |
|-----------|----------|--------------|--------|-----------|
| Giornaliera | Daily Check-in STEP B | Dev Team | Log ✅ / ⚠️ vincoli | CI/CD |
| Settimanale | Aggiornamento Audit Ostile | Lead Engineer | Tabella aggiornata | Notion / Wiki |
| Bi-settimanale | Early Adopter Feedback | UX Analyst | Report dolori/successi | Notion / Dashboard |
| Mensile | Reporting e Decision-Making | Principal Engineer | Checkpoint FASE 1 | Jira / Linear / Meeting |

---

## 7. Regole di Conduzione
- Tutte le modifiche devono essere tracciate e versionate.
- Nessun vincolo STEP B puo essere bypassato senza autorizzazione documentata.
- Ogni eccezione deve indicare motivazione, impatto e approvazione.
- Early Adopter feedback deve essere correlato a vincoli e audit.
- Audit Ostile aggiornato deve essere accessibile al team in ogni momento.
- Ogni attivita deve produrre log verificabili per audit interno.
