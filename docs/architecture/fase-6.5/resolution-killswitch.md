# Resolution Kill-Switch — Specifica (Microstep 6.5.5)

**Status:** Engineering specification  
**Implementazione:** `src/core/resolution/resolution-killswitch.ts`

---

## 1. Livelli di kill-switch

| Livello | Campo | Effetto |
|---------|--------|---------|
| **Globale** | globalKill: true | Tutte le risoluzioni bloccate. Nessuna chiamata a resolve() deve produrre esecuzione; il controllo pre-resolution restituisce BLOCKED. |
| **Per feature** | featureKills: string[] | Se context.featureId è in featureKills, la risoluzione per quella feature è bloccata. |
| **Per authority** | authorityKills: AuthoritySourceId[] | Le decisioni delle authority in lista vengono filtrate prima di resolve(). Effetto: quella authority non partecipa alla risoluzione (come se non avesse emesso decisione). |

Stato immutabile: **ResolutionKillSwitchState**. Stesso stato + stesso context → stesso PreResolutionCheckResult (determinismo assoluto).

---

## 2. Verifica pre-resolution

**checkPreResolution(context, state): PreResolutionCheckResult**

1. Se **globalKill** → `{ proceed: false, reason: "Resolution kill-switch: global", auditEntry }`.
2. Altrimenti se **featureId in featureKills** → `{ proceed: false, reason: "Resolution kill-switch: feature", auditEntry }`.
3. Altrimenti: filtra `context.authorityDecisions` rimuovendo le decisioni la cui authority è in **authorityKills** → `{ proceed: true, filteredDecisions }`.

Quando `proceed: false`, l'**audit è obbligatorio**: il caller deve appendere `auditEntry` allo store di audit (appendResolutionAudit). L'entry ha status BLOCKED, winningRuleId = "resolution-kill-switch", reason = motivo del blocco, decisionsSnapshot = [].

---

## 3. Scenari di emergenza

- **Emergenza globale:** Incidente di sicurezza o degradazione sistema → globalKill = true. Tutte le richieste di risoluzione restituiscono BLOCKED senza eseguire resolve(). Fase 7 (Execution) non riceve mai ALLOWED/FORCED per nessuna feature.
- **Feature compromessa:** Una feature specifica è buggata o abusata → si aggiunge featureId a featureKills. Solo quella feature è bloccata; le altre continuano a risolversi normalmente.
- **Authority da disattivare:** Un'authority (es. un guardrail o una policy) deve essere temporaneamente disattivata senza cambiare codice → si aggiunge l'authority a authorityKills. Le sue decisioni vengono ignorate; le altre authority determinano l'esito.

Nessuna mediazione: il kill-switch blocca in modo deterministico. Nessun fallback "soft".

---

## 4. Integrazione con Fase 7 (Execution)

- **Flusso:** Execution Runtime, prima di eseguire un'azione, ottiene un ResolutionResult (da resolve o da blocco kill-switch). Se il risultato è BLOCKED (incluso per kill-switch), l'execution non procede.
- **Correlazione:** L'audit entry di kill-switch include resolutionId, featureId, executionRequestId (se presente). Permette di tracciare "questa execution non è avvenuta perché resolution kill-switch: global/feature".
- **Nessun bypass:** Fase 7 non deve mai eseguire quando ResolutionResult.status è BLOCKED, indipendentemente dalla causa (policy, preference o kill-switch).

---

## 5. Simulazioni di failure

- **Test global kill:** Impostare state con globalKill = true; chiamare checkPreResolution; attendersi proceed = false e reason "Resolution kill-switch: global". Verificare che auditEntry sia presente e appendibile.
- **Test feature kill:** Impostare featureKills = [featureId]; context con quel featureId; attendersi proceed = false, reason "Resolution kill-switch: feature".
- **Test authority kill:** Impostare authorityKills = [WELLBEING_PROTECTION]; context con decisioni incluso WELLBEING BLOCKED; attendersi proceed = true e filteredDecisions senza WELLBEING; poi resolve con filteredDecisions produce esito diverso (es. ALLOWED se le restanti sono ALLOWED).
- **Determinismo:** Stesso context e stesso state in N run → stesso PreResolutionCheckResult (deep equal).

---

## 6. Riferimenti

- Resolution engine: resolution-engine.md
- Audit: resolution-audit.md, resolution-audit-spec.md
- Fase 7: Execution Runtime
