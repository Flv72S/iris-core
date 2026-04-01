# Authority Hierarchy (Fase 6.5)

**Status:** Engineering specification  
**Purpose:** Formalize precedence; remove ambiguity between wellbeing, guardrail, mode, policy, preference.

---

## 1. Ordine di precedenza (fisso)

L'ordine sotto è **hard-coded** e non configurabile a runtime. La prima authority che restituisce uno status non-ALLOWED vince; le successive non sono valutate per determinare il risultato.

```
1. WELLBEING
2. GUARDRAIL
3. FEATURE_POLICY
4. USER_PREFERENCE
```

---

## 2. Definizione per authority

| AuthoritySourceId | Fase di origine | Scope | Esempio ruleId |
|-------------------|-----------------|--------|----------------|
| WELLBEING | Product / Policy | Blocco globale quando uxExperience indica BLOCKED (wellbeing protection). | wellbeing-protection |
| GUARDRAIL | Execution (Fase 4) | Cooldown, max actions per finestra, limiti di sicurezza execution. | cooldown-per-feature, max-actions-per-window |
| FEATURE_POLICY | Fase 5 | Feature Activation Policies: focus mode, overload, self-discipline. | focus-mode-restriction, overload-prevention, feature-self-discipline |
| USER_PREFERENCE | Fase 6 | Opt-out esplicito: feature, category, mode, notifications. | feature-opt-out, mode-specific-opt-out, notification-consent |

---

## 3. Regole di non-ambiguità

- **WELLBEING vs GUARDRAIL:** WELLBEING ha precedenza. Se wellbeing blocca, i guardrail non vengono consultati per il risultato.
- **WELLBEING vs FEATURE_POLICY:** WELLBEING ha precedenza. Es.: experience BLOCKED implica blocco indipendentemente da policy di focus.
- **FEATURE_POLICY vs USER_PREFERENCE:** FEATURE_POLICY ha precedenza. Una policy che blocca non può essere sovrascritta da preferenza utente.
- **USER_PREFERENCE:** Può solo restringere (BLOCKED). Non può mai forzare ALLOWED su una feature già bloccata da policy o guardrail.

Nessuna authority può "sorpassare" una authority di ordine superiore. Nessun override silenzioso.

---

## 4. Mapping status verso outcome

- **BLOCKED:** Execution non consentita. Explainability: winningAuthorityId + winningRuleId + reason.
- **FORCED:** Caso riservato a guardrail/product per forzare un comportamento in condizioni definite (es. sicurezza). Non introdotto da user preference.
- **SUSPENDED:** Esecuzione sospesa (es. temporaneamente disabilitata senza opt-out permanente). Non introdotto da user preference in Fase 6.
- **ALLOWED:** Nessuna authority ha bloccato/forzato/sospeso; si può procedere verso Execution (Fase 7) se il resto del flusso lo consente.

---

## 5. Riferimenti

- Data model: resolution-engine-data-model.md
- State machine: resolution-state-machine.md
