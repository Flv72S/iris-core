# Conflict Resolution Rules — Specifica tecnica (Microstep 6.5.3)

**Status:** Engineering specification  
**Implementazione:** `src/core/resolution/conflict-rules.ts`  
**Versione regole:** 1.0 (CONFLICT_RULES_VERSION)

---

## 1. Tabella conflitti

Riga = scenario di conflitto; colonna = esito (authority vincente). Precedenza: USER_HARD_BLOCK > WELLBEING_PROTECTION > SYSTEM_GUARDRAIL > PRODUCT_MODE > FEATURE_POLICY > DEFAULT_BEHAVIOR.

| Conflitto | Authority A | Authority B (o altre) | Vincitore | rule_id |
|-----------|-------------|------------------------|-----------|---------|
| User block vs wellbeing allow | USER_HARD_BLOCK BLOCKED | WELLBEING_PROTECTION ALLOWED | USER_HARD_BLOCK | conflict.user-hard-block-absolute |
| Wellbeing block vs user allow | WELLBEING_PROTECTION BLOCKED | FEATURE_POLICY / user intent ALLOWED | WELLBEING_PROTECTION | conflict.wellbeing-over-user-allow |
| Focus block vs feature policy allow | PRODUCT_MODE BLOCKED | FEATURE_POLICY ALLOWED | PRODUCT_MODE | conflict.focus-blocks-distractions |
| Feature policy block vs default allow | FEATURE_POLICY BLOCKED | DEFAULT_BEHAVIOR ALLOWED | FEATURE_POLICY | conflict.feature-policy-restricts |
| Tutte ALLOWED | (tutte ALLOWED) | — | nessuno (ALLOWED) | conflict.all-allowed |

Regola generale: **la prima authority in ordine di precedenza con status non-ALLOWED (BLOCKED, FORCED, SUSPENDED) vince.** L’ordine è hard-coded in `AUTHORITY_SOURCE_ORDER`; non dipende dall’ordine di presentazione delle decisioni in input.

---

## 2. Rationale di sicurezza

- **User hard block assoluto:** Un opt-out esplicito dell’utente (USER_HARD_BLOCK) non può essere scavalcato da wellbeing, guardrail, product mode o feature policy. Rispetto della scelta utente e minimizzazione del rischio di esecuzione non desiderata.
- **Wellbeing > user allow:** Se l’experience indica BLOCKED (wellbeing), il sistema non esegue anche se altre authority (es. feature policy o preferenze) consentirebbero. Protezione del benessere ha priorità sulla “convenienza” dell’esecuzione.
- **Focus blocca distrazioni:** In modalità FOCUS, solo le feature in whitelist sono consentite; PRODUCT_MODE ha precedenza su FEATURE_POLICY, così le policy non possono riattivare feature considerate distrazione in quella modalità.
- **Nessuna inferenza:** L’esito è determinato solo dalla presenza/assenza di una decisione non-ALLOWED per ogni authority e dall’ordine fisso. Nessun punteggio, nessuna mediazione, nessun LLM.

---

## 3. Relazione con Fase 13 (Determinism Certification)

- **Replay:** Dato un insieme di decisioni (e la versione delle regole), `getWinningDecision(decisions)` è deterministico. Stesso input → stesso winning decision e stesso `getConflictRuleId(winning)`. Un certificatore può ri-eseguire con le stesse decisioni e verificare l’esito.
- **Versione:** `CONFLICT_RULES_VERSION` identifica la versione delle regole. Un cambio di precedenza o di rule_id deve incrementare la versione e essere documentato.
- **Audit:** Ogni risoluzione può registrare `rule_id` (da `getConflictRuleId`) e `CONFLICT_RULES_VERSION`; l’audit è quindi tracciabile e verificabile in modo deterministico.

---

## 4. Rule ID stabili

| rule_id | Significato |
|---------|-------------|
| conflict.wellbeing-over-user-allow | Wellbeing protection vince su allow da altre authority |
| conflict.user-hard-block-absolute | User hard block vince su tutte |
| conflict.focus-blocks-distractions | Product mode (focus) blocca feature non in whitelist |
| conflict.feature-policy-restricts | Feature policy blocca/restringe |
| conflict.all-allowed | Nessuna restrizione; esito ALLOWED |

---

## 5. Riferimenti

- Authority order: `authority-hierarchy.md`, `authority-sources.ts`
- Resolution Engine: `resolution-engine.md`, `resolution-engine.ts`
- Audit: `resolution-audit-spec.md`
