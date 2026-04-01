# Resolution Engine — Data Model (Fase 6.5)

**Status:** Engineering specification  
**Determinism:** Mandatory. Same input implies same output.  
**LLM:** Forbidden in decision path.

---

## 1. Panoramica tecnica

Il **Resolution Engine** produce un **ResolutionResult** univoco a partire da **ResolutionContext** e dall'ordine fisso delle Authority Sources. Non decide l'azione; decide solo lo status: `ALLOWED` | `BLOCKED` | `FORCED` | `SUSPENDED`.

- **Input:** ResolutionContext (featureId, productMode, derivedState, uxExperience, now, authorityDecisions, executionRequestId opzionale).
- **Output:** ResolutionResult (status, winning authority, rule_id, audit payload).
- **Proprietà:** deterministico, serializzabile, replayabile, isolato da runtime esterni.

---

## 2. ResolutionContext

Contesto immutabile in ingresso al Resolution Engine.

```ts
type ResolutionContext = {
  readonly resolutionId: string;
  readonly featureId: string;
  readonly productMode: ProductMode;
  readonly derivedState: DerivedStateSnapshot;
  readonly uxExperience: UxExperienceState;
  readonly now: number;
  readonly authorityDecisions: readonly AuthorityDecision[];
  readonly executionRequestId?: string;
};

type ProductMode = 'DEFAULT' | 'FOCUS' | 'WELLBEING';
```

- `resolutionId`: identificatore univoco della risoluzione.
- `authorityDecisions`: array ordinato per precedenza (indice 0 = massima priorità), popolato dal caller secondo AUTHORITY_SOURCE_ORDER.

---

## 3. Authority Sources (ordine hard-coded)

```ts
const AUTHORITY_SOURCE_ORDER: readonly AuthoritySourceId[] = [
  'WELLBEING',
  'GUARDRAIL',
  'FEATURE_POLICY',
  'USER_PREFERENCE',
] as const;

type AuthoritySourceId = (typeof AUTHORITY_SOURCE_ORDER)[number];
```

- Ordine 0: WELLBEING (product/policy).
- Ordine 1: GUARDRAIL (execution, Fase 4).
- Ordine 2: FEATURE_POLICY (Fase 5).
- Ordine 3: USER_PREFERENCE (Fase 6).

Il Resolution Engine non invoca le authority; riceve `authorityDecisions` già popolato.

---

## 4. AuthorityDecision

```ts
type AuthorityDecision = {
  readonly authorityId: AuthoritySourceId;
  readonly status: AuthorityStatus;
  readonly ruleId: string | null;
  readonly reason: string | null;
};

type AuthorityStatus = 'ALLOWED' | 'BLOCKED' | 'FORCED' | 'SUSPENDED';
```

- `ruleId`: obbligatorio se status non è ALLOWED.
- `reason`: messaggio deterministico per audit; nessuna generazione narrativa.

---

## 5. ResolutionResult

```ts
type ResolutionResult = {
  readonly resolutionId: string;
  readonly status: ResolutionStatus;
  readonly winningAuthorityId: AuthoritySourceId | null;
  readonly winningRuleId: string | null;
  readonly reason: string | null;
  readonly resolvedAt: number;
  readonly auditEntry: ResolutionAuditEntry;
};

type ResolutionStatus = 'ALLOWED' | 'BLOCKED' | 'FORCED' | 'SUSPENDED';
```

- `winningAuthorityId`: prima authority con status non-ALLOWED; null se tutte ALLOWED.
- `resolvedAt`: timestamp di risoluzione (es. context.now).

---

## 6. ResolutionAuditEntry

```ts
type ResolutionAuditEntry = {
  readonly resolutionId: string;
  readonly featureId: string;
  readonly executionRequestId: string | null;
  readonly status: ResolutionStatus;
  readonly winningAuthorityId: AuthoritySourceId | null;
  readonly winningRuleId: string | null;
  readonly reason: string | null;
  readonly resolvedAt: number;
  readonly decisionsSnapshot: readonly AuthorityDecisionSnapshot[];
  readonly payloadHash: string;
};

type AuthorityDecisionSnapshot = {
  readonly authorityId: AuthoritySourceId;
  readonly status: AuthorityStatus;
  readonly ruleId: string | null;
  readonly reason: string | null;
};
```

- `decisionsSnapshot`: copia immutabile di tutte le AuthorityDecision in ordine (replay).
- `payloadHash`: hash deterministico (es. SHA-256 di JSON canonico).

---

## 7. Proprietà formali

- **Determinismo:** stesso ResolutionContext implica stesso ResolutionResult. No random, no inferenza probabilistica.
- **Replayabilità:** decisionsSnapshot + resolutionId consentono ricalcolo e verifica.
- **Serializzazione:** tutti i tipi serializzabili in JSON con ordine campi definito (canonical JSON per hashing).
- **Isolamento:** nessuna dipendenza da clock non esplicito, nessun I/O, nessun servizio esterno.

---

## 8. Esempi JSON

**ResolutionContext (ridotto):**

```json
{
  "resolutionId": "res-a1b2c3",
  "featureId": "smart-inbox",
  "productMode": "DEFAULT",
  "now": 1704110400000,
  "authorityDecisions": [
    { "authorityId": "WELLBEING", "status": "ALLOWED", "ruleId": null, "reason": null },
    { "authorityId": "GUARDRAIL", "status": "ALLOWED", "ruleId": null, "reason": null },
    { "authorityId": "FEATURE_POLICY", "status": "ALLOWED", "ruleId": null, "reason": null },
    { "authorityId": "USER_PREFERENCE", "status": "BLOCKED", "ruleId": "feature-opt-out", "reason": "User disabled this feature" }
  ],
  "executionRequestId": "exec-xyz"
}
```

**ResolutionResult (BLOCKED):**

```json
{
  "resolutionId": "res-a1b2c3",
  "status": "BLOCKED",
  "winningAuthorityId": "USER_PREFERENCE",
  "winningRuleId": "feature-opt-out",
  "reason": "User disabled this feature",
  "resolvedAt": 1704110400000,
  "auditEntry": {
    "resolutionId": "res-a1b2c3",
    "featureId": "smart-inbox",
    "executionRequestId": "exec-xyz",
    "status": "BLOCKED",
    "winningAuthorityId": "USER_PREFERENCE",
    "winningRuleId": "feature-opt-out",
    "reason": "User disabled this feature",
    "resolvedAt": 1704110400000,
    "decisionsSnapshot": [
      { "authorityId": "WELLBEING", "status": "ALLOWED", "ruleId": null, "reason": null },
      { "authorityId": "GUARDRAIL", "status": "ALLOWED", "ruleId": null, "reason": null },
      { "authorityId": "FEATURE_POLICY", "status": "ALLOWED", "ruleId": null, "reason": null },
      { "authorityId": "USER_PREFERENCE", "status": "BLOCKED", "ruleId": "feature-opt-out", "reason": "User disabled this feature" }
    ],
    "payloadHash": "<SHA-256 canonical JSON>"
  }
}
```

---

## 9. Mapping verso altre fasi

- **Fase 7 (Execution Runtime):** Riceve ResolutionResult.status. Solo ALLOWED o FORCED abilitano execution; BLOCKED/SUSPENDED no. executionRequestId e resolutionId per correlazione.
- **Fase 10 (Explainability):** Spiegazione = winningAuthorityId + winningRuleId + reason. Solo dati strutturati.
- **Fase 13 (Determinism Certification):** payloadHash + decisionsSnapshot + stesso context per ricalcolo e confronto.

---

## 10. Riferimenti

- Authority hierarchy: authority-hierarchy-spec.md
- Audit format: resolution-audit-spec.md
- State machine: resolution-state-machine.md
