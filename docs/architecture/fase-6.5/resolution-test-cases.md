# Resolution Test Cases (Fase 6.5)

**Status:** Engineering specification  
**Purpose:** Golden paths, hard-coded conflicts, determinism certification (Fase 13).

---

## 1. Golden path — tutte ALLOWED

**Input:** authorityDecisions = [ALLOWED, ALLOWED, ALLOWED, ALLOWED] per WELLBEING, GUARDRAIL, FEATURE_POLICY, USER_PREFERENCE.

**Atteso:** ResolutionResult.status = ALLOWED; winningAuthorityId = null; winningRuleId = null; reason = null.

**Verifica:** Idempotenza: stesso context → stesso result e stesso auditEntry.payloadHash su N run.

---

## 2. BLOCKED da WELLBEING (indice 0)

**Input:** decisions[0] = { authorityId: WELLBEING, status: BLOCKED, ruleId: "wellbeing-protection", reason: "Wellbeing protection active" }; restanti ALLOWED (o non rilevanti dopo early exit).

**Atteso:** ResolutionResult.status = BLOCKED; winningAuthorityId = WELLBEING; winningRuleId = "wellbeing-protection"; reason = "Wellbeing protection active".

**Verifica:** decisionsSnapshot contiene almeno decisions[0]; payloadHash deterministico.

---

## 3. BLOCKED da USER_PREFERENCE (indice 3)

**Input:** decisions[0..2] = ALLOWED; decisions[3] = { authorityId: USER_PREFERENCE, status: BLOCKED, ruleId: "feature-opt-out", reason: "User disabled this feature" }.

**Atteso:** ResolutionResult.status = BLOCKED; winningAuthorityId = USER_PREFERENCE; winningRuleId = "feature-opt-out".

**Verifica:** Nessuna influenza da WELLBEING/GUARDRAIL/FEATURE_POLICY (già ALLOWED).

---

## 4. Conflitto hard-coded — WELLBEING vince su USER_PREFERENCE

**Input:** decisions[0] = WELLBEING BLOCKED; decisions[3] = USER_PREFERENCE BLOCKED. (Decisions 1–2 ALLOWED.)

**Atteso:** Risultato BLOCKED con winningAuthorityId = WELLBEING. La decisione USER_PREFERENCE non cambia l'esito.

**Verifica:** State machine esce al primo non-ALLOWED; ordine di precedenza rispettato.

---

## 5. FORCED (guardrail)

**Input:** decisions[0] = ALLOWED; decisions[1] = { authorityId: GUARDRAIL, status: FORCED, ruleId: "safety-forced", reason: "Safety override" }; restanti non valutati.

**Atteso:** ResolutionResult.status = FORCED; winningAuthorityId = GUARDRAIL; winningRuleId = "safety-forced".

**Verifica:** Terminalità anticipata; nessuna lettura di FEATURE_POLICY o USER_PREFERENCE.

---

## 6. Replay

**Input:** ResolutionContext C1 con authorityDecisions e now fissi. Eseguire resolve(C1) due volte.

**Atteso:** ResolutionResult R1 = R2 (deep equal); auditEntry.payloadHash identico.

**Verifica:** Determinismo e idempotenza.

---

## 7. Replay da audit

**Input:** ResolutionAuditEntry E prodotta da una risoluzione precedente. Ricostruire un ResolutionContext C2 da E.decisionsSnapshot, resolutionId, featureId, resolvedAt (e altri campi invarianti).

**Atteso:** resolve(C2) produce un ResolutionResult con stesso status, winningAuthorityId, winningRuleId di E; payloadHash del nuovo auditEntry coincide con E.payloadHash (se algoritmo e canonical JSON invariati).

**Verifica:** Replayabilità e certificazione determinismo (Fase 13).

---

## 8. Serializzazione round-trip

**Input:** ResolutionContext C serializzato in JSON canonico e deserializzato in C'.

**Atteso:** resolve(C) e resolve(C') producono lo stesso ResolutionResult e stesso payloadHash.

**Verifica:** Nessuna perdita di informazioni; formato stabile.

---

## 9. Riferimenti

- Data model: resolution-engine-data-model.md
- State machine: resolution-state-machine.md
- Audit: resolution-audit-spec.md
