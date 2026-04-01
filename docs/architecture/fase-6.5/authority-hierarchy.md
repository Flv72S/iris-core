# Authority Hierarchy — Definizione formale (Microstep 6.5.1)

**Status:** Engineering specification  
**Ordine:** Hard-coded, immutabile. Nessuna mediazione tra authority. Nessun LLM.

---

## 1. Definizione formale della gerarchia

La gerarchia è la sequenza ordinata delle **Authority Sources**. L’ordine è fissato nel codice (`authority-sources.ts`) e non è configurabile a runtime.

| Precedenza | AuthoritySourceId      | Significato |
|------------|------------------------|-------------|
| 0 (massima) | USER_HARD_BLOCK       | Blocco esplicito dell’utente (es. feature disabilitata, mode disabilitato). |
| 1          | WELLBEING_PROTECTION  | Protezione wellbeing: stato BLOCKED dell’experience blocca l’esecuzione. |
| 2          | SYSTEM_GUARDRAIL     | Guardrail di sistema (execution): cooldown, max actions, limiti di sicurezza. |
| 3          | PRODUCT_MODE         | Restrizioni legate alla modalità prodotto (FOCUS, WELLBEING, DEFAULT). |
| 4          | FEATURE_POLICY       | Feature Activation Policies (Fase 5): focus, overload, self-discipline. |
| 5 (minima) | DEFAULT_BEHAVIOR     | Comportamento di default: nessuna restrizione; equivale a ALLOWED se tutte le precedenti sono ALLOWED. |

**Regola di risoluzione:** la prima authority (in questo ordine) che emette una decisione non-ALLOWED è la **winning authority**. Le authority successive non vengono usate per determinare il risultato (terminalità anticipata).

---

## 2. Motivazione architetturale

- **Un solo ordine:** evita conflitti e interpretazioni. Backend e audit usano la stessa sequenza.
- **User first (blocco):** USER_HARD_BLOCK ha precedenza massima così un opt-out esplicito dell’utente non può essere scavalcato da wellbeing, guardrail o policy.
- **Wellbeing e sicurezza:** WELLBEING_PROTECTION e SYSTEM_GUARDRAIL precedono product mode e feature policy, così limiti di sicurezza e protezione non sono bypassabili da configurazione prodotto.
- **Product e feature:** PRODUCT_MODE e FEATURE_POLICY definiscono cosa il prodotto consente; DEFAULT_BEHAVIOR è il fallback “tutto consentito” quando nessuna authority superiore restringe.

Nessuna “mediazione” tra authority: nessun punteggio, nessuna negoziazione. Solo: ordine fisso e prima decisione non-ALLOWED vince.

---

## 3. Proprietà di sicurezza

- **Immutabilità:** l’ordine è definito in un `as const` e non è modificabile a runtime. Nessun registro o configurazione iniettata.
- **Determinismo:** stesso insieme di decisioni (ordinate per authority) produce sempre la stessa winning authority e lo stesso risultato.
- **Auditabilità:** ogni risoluzione può registrare l’ordine usato (`AUTHORITY_SOURCE_ORDER`) e la winning authority; replay e verifica sono ben definiti.
- **No override silenzioso:** nessuna authority può ignorare o sovrascrivere una authority di precedenza superiore. L’unico modo per “vincere” è essere la prima con status non-ALLOWED.

---

## 4. Mapping verso explainability

Per Fase 10 (Explainability) la spiegazione è solo dati strutturati, non testo generato:

- **winningAuthorityId:** valore da `AuthoritySourceId` (es. `USER_HARD_BLOCK`, `WELLBEING_PROTECTION`).
- **winningRuleId:** identificatore della regola che ha emesso la decisione (es. `feature-opt-out`, `wellbeing-protection`).
- **reason:** stringa deterministica prodotta dalla regola (es. "User disabled this feature").

La gerarchia non produce testo; fornisce il **ordine di valutazione** e la **winning authority**, che explainability usa come fonte della spiegazione.

---

## 5. Integrazione con Resolution Engine

- **Input:** il Resolution Engine riceve un array di decisioni già ordinate per `AuthoritySourceId` secondo `AUTHORITY_SOURCE_ORDER`. Il caller è responsabile di rispettare questo ordine.
- **Algoritmo:** iterazione in ordine su `authorityDecisions`; prima decisione con status non-ALLOWED determina il risultato e termina la scansione.
- **Output:** `ResolutionResult` con `winningAuthorityId`, `winningRuleId`, `reason` e `status` (ALLOWED | BLOCKED | FORCED | SUSPENDED).
- **Audit:** ogni entry di audit include l’ordine delle authority (implicito in `decisionsSnapshot`) e la winning authority; il payload è serializzabile e hashabile per Fase 13.

Riferimenti: `resolution-engine-data-model.md`, `resolution-state-machine.md`, `authority-sources.ts`.
