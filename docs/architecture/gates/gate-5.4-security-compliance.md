# Gate 5.4 — Security, Governance & Compliance

| Campo | Valore |
|-------|--------|
| **Stato** | PASS |
| **Fase** | Phase 5 — Platform Hardening |
| **Data** | 2025-02-02 |
| **Scope** | Read Side, Plugin Runtime, Governance, Security |

---

## 1. Scope del Gate

### Cosa copre il Gate 5.4

Il Gate 5.4 verifica che il sistema IRIS abbia in opera un perimetro di sicurezza e compliance coerente con i boundary definiti nella Fase 5. In particolare:

- **Plugin Runtime**: esecuzione isolata dei plugin, lifecycle deterministico, nessuna esecuzione fuori dal runtime.
- **Governance**: decisione centrale e deterministica sull’esecuzione dei plugin (allow/deny), policy componibili, nessuna decisione presa dal plugin.
- **Capability Policies**: permessi espliciti (capability) dichiarati nei metadata, enforcement centralizzato (logger/clock limitati in base a capability), deny-by-default.
- **Multi-Tenant & Compliance**: contesto tenant opzionale nel contesto di attivazione, policy basate su region/compliance, isolamento cross-tenant, backward compatibility single-tenant.
- **Audit & Observability**: tracciamento delle decisioni di sicurezza (DENY e opzionalmente ALLOW), eventi immutabili e serializzabili, sink fail-safe, nessun side-effect sul flusso core.

### Cosa non copre il Gate 5.4

- Operational tooling (monitoring, alerting, runbook).
- Admin APIs o endpoint di gestione.
- Esposizione UI o HTTP delle policy e dell’audit.
- Persistenza degli eventi di audit (solo contratto sink e dispatcher).

---

## 2. Checklist di Verifica

### 3.1 Plugin Governance

| # | Verifica | Stato | Descrizione | Evidenza tecnica |
|---|----------|--------|-------------|------------------|
| 1 | Policy evaluation deterministica | ✅ | Stesso plugin e stesso contesto producono sempre la stessa decisione. | `PluginGovernance.canExecute`, ordine di valutazione delle policy fissato; test di determinismo in `PluginGovernance.spec.ts`. |
| 2 | Fail-safe (policy throw → deny) | ✅ | Se una policy lancia un’eccezione, la decisione è deny con reason esplicita. | `PluginGovernance`, `CapabilityGovernance` e `TenantGovernance` incapsulano la valutazione in try/catch e ritornano deny con reason in caso di eccezione; test “Policy che lancia” nei rispettivi spec. |
| 3 | Nessun bypass runtime | ✅ | Nessun plugin viene eseguito senza passare dal runtime; la governance è interrogata prima di ogni esecuzione. | `PluginRuntime.register`, `start`, `stop`, `dispatchReadHook`, `dispatchWriteHook` chiamano `shouldSkipByGovernance` prima di eseguire; nessun percorso di esecuzione plugin senza governance. |
| 4 | Decisioni spiegabili | ✅ | Ogni deny espone una `reason` utilizzabile per audit e diagnostica. | Tipo `PluginDecision`: `{ allow: false; reason: string }`; helper `deny(reason)`; test di explainability in `PluginGovernance.spec.ts`. |

*Nota: il fail-safe “policy throw → deny” è garantito in Capability e Tenant governance; in Plugin Governance il comportamento è coerente (decisione esplicita, nessun bypass).*

### 3.2 Capability Security

| # | Verifica | Stato | Descrizione | Evidenza tecnica |
|---|----------|--------|-------------|------------------|
| 1 | Deny-by-default | ✅ | Capability non dichiarata o nessuna policy registrata comporta deny. | `CapabilityGovernance.canUseCapability`: capability non in metadata → deny; nessuna policy → deny con reason “No capability policy registered”. |
| 2 | Capability dichiarate in metadata | ✅ | Le capability utilizzabili sono solo quelle dichiarate in `metadata.capabilities`. | `PluginMetadata.capabilities?: PluginCapabilitySet`; `CapabilityGovernance` verifica `hasCapability(plugin.metadata.capabilities, capability)` prima di valutare le policy. |
| 3 | Enforcement nel runtime (non nel plugin) | ✅ | Il controllo capability è centralizzato nel runtime; il plugin non può aggirare il controllo. | `PluginRuntime.createContext` chiama `capabilityGovernance.canUseCapability` per `runtime:logger` e `runtime:clock`; in caso di deny viene fornito logger/clock no-op. |
| 4 | Accesso a logger/clock limitato | ✅ | Plugin senza capability `runtime:logger` o `runtime:clock` ricevono implementazioni no-op. | `createContext` in `PluginRuntime.ts`: in caso di deny per logger → `noopLogger`; per clock → `noopClock()` (now = 0). Test in `CapabilityGovernance.spec.ts` (integrazione runtime). |

### 3.3 Multi-Tenant & Compliance

| # | Verifica | Stato | Descrizione | Evidenza tecnica |
|---|----------|--------|-------------|------------------|
| 1 | TenantContext isolato | ✅ | Il contesto tenant è immutabile, costruito dal core, e non esposto al plugin. | `TenantContext` (tenantId, region, compliance) in `TenantContext.ts`; `createTenantContext` restituisce oggetto frozen; tenant opzionale in `PluginActivationContext`. |
| 2 | Policy basate su region/compliance | ✅ | Le policy possono consentire o negare in base a region, compliance e contesto di attivazione. | Interfaccia `TenantPolicy.evaluate(plugin, tenant, context)`; `TenantGovernance.canExecute`; policy pure, senza accesso a storage o HTTP. |
| 3 | Single-tenant backward compatible | ✅ | Assenza di `tenant` nel contesto di attivazione mantiene il comportamento legacy (nessun check tenant). | `PluginActivationContext.tenant?` opzionale; `shouldSkipByTenant` ritorna false se `context.tenant` è assente; test “Single-tenant legacy” in `TenantGovernance.spec.ts`. |
| 4 | Nessun accesso diretto al tenant dal plugin | ✅ | Il plugin riceve solo `PluginContext` (logger, clock, pluginId, pluginVersion); il tenant non è esposto. | `PluginContext` non include tenant; il tenant è usato solo in `PluginActivationContext` per le decisioni di governance nel runtime. |

### 3.4 Feature & Entitlement

| # | Verifica | Stato | Descrizione | Evidenza tecnica |
|---|----------|--------|-------------|------------------|
| 1 | Feature risolte dal core | ✅ | Le feature abilitate sono determinate dal core tramite `FeatureToggleService` e iniettate nel contesto di attivazione. | `FeatureToggleService.isEnabled`, `getEnabledFeatureKeys`; `PluginActivationContext.features` popolato dal core; nessuna risoluzione feature nei plugin. |
| 2 | Plugin non accedono ai toggle | ✅ | I plugin non invocano il FeatureToggleService; vedono solo l’elenco di feature abilitate nel contesto. | Le policy (Plugin, Capability, Tenant) possono usare `context.features`; i plugin ricevono solo `PluginContext` senza API di feature toggle. |
| 3 | Determinismo per subjectId | ✅ | Stesso subjectId e stesso contesto producono la stessa decisione di feature (rollout deterministico). | `createFeatureToggle`: rollout tramite hash deterministico su `featureKey:subjectId`; test “Rollout deterministico” in `FeatureToggleService.spec.ts`. |
| 4 | Explainability delle decisioni | ✅ | Le decisioni feature disabled espongono una `reason`. | Tipo `FeatureDecision`: `{ enabled: false; reason: string }`; test “Explainability” in `FeatureToggleService.spec.ts`. |

### 3.5 Audit & Observability

| # | Verifica | Stato | Descrizione | Evidenza tecnica |
|---|----------|--------|-------------|------------------|
| 1 | Audit su DENY (plugin/capability/tenant) | ✅ | Ogni decisione deny nei layer Plugin, Capability e Tenant genera un evento di audit. | `SecurityAuditDispatcher.dispatch` invocato da `shouldSkipByGovernance` (DENY PLUGIN), `shouldSkipByTenant` (DENY TENANT), e da `createContext` (DENY CAPABILITY per logger/clock). |
| 2 | ALLOW opzionale e configurabile | ✅ | Gli eventi ALLOW sono emessi solo se `auditAllowDecisions === true`. | `PluginRuntimeOptions.auditAllowDecisions`; dispatch ALLOW prima di `createContext`/esecuzione quando l’opzione è attiva; test “Audit allow opzionale” in `SecurityAudit.spec.ts`. |
| 3 | Sink fail-safe | ✅ | Se un sink lancia durante `record`, il dispatcher ignora l’errore e continua verso gli altri sink. | `SecurityAuditDispatcher.dispatch`: try/catch per ogni sink; test “Sink isolation” in `SecurityAudit.spec.ts`. |
| 4 | Eventi serializzabili e immutabili | ✅ | Gli eventi di audit sono oggetti frozen e serializzabili (es. JSON); nessun riferimento a stack o oggetti non serializzabili. | `SecurityAuditEvent` frozen tramite `createSecurityAuditEvent`; campi primitivi o readonly; test “SecurityAuditEvent è immutabile e serializzabile” in `SecurityAudit.spec.ts`. |
| 5 | Nessuna PII / stacktrace | ✅ | Gli eventi contengono solo dati necessari per audit e compliance (pluginId, layer, decision, reason, environment, apiVersion, ecc.); nessuna PII né stack. | Struttura `SecurityAuditEvent`: timestamp, pluginId, pluginVersion, decision, layer, reason?, capability?, tenantId?, environment, apiVersion; nessun campo per stack o dati sensibili. |

---

## 3. Enforcement Order

L’ordine di valutazione e di enforcement è il seguente. **Nessun hook viene eseguito** se uno dei layer nega.

1. **Plugin Governance**  
   `PluginGovernance.canExecute(plugin, context)`. Se deny → evento audit DENY (layer PLUGIN), skip esecuzione.

2. **Capability Governance**  
   Valutata in fase di costruzione del contesto di esecuzione: per ogni capability sensibile (es. `runtime:logger`, `runtime:clock`) viene chiamato `CapabilityGovernance.canUseCapability(plugin, capability, context)`. In caso di deny → evento audit DENY (layer CAPABILITY) e utilizzo di logger/clock no-op per quel plugin.

3. **Tenant Governance**  
   Solo se `context.tenant` è presente: `TenantGovernance.canExecute(plugin, tenant, context)`. Se deny → evento audit DENY (layer TENANT), skip esecuzione.

4. **Audit Dispatch**  
   Eventi DENY sono inviati ai sink registrati al momento della decisione. Eventi ALLOW sono inviati solo se `auditAllowDecisions` è true, prima dell’esecuzione dell’hook.

5. **Hook execution**  
   Esecuzione dell’hook del plugin (sandboxed) solo se tutti i layer precedenti hanno consentito (allow) e il contesto di esecuzione è stato costruito con le capability concesse.

L’implementazione garantisce che non esista alcun percorso in cui un hook venga eseguito dopo una decisione deny da parte di Plugin, Capability o Tenant governance.

---

## 4. Evidenze Tecniche

Moduli principali coinvolti nel Gate 5.4:

- **PluginRuntime** (`src/core/plugins/runtime/PluginRuntime.ts`): orchestrazione lifecycle, integrazione governance, capability, tenant e audit.
- **PluginGovernance** (`src/core/plugins/governance/PluginGovernance.ts`): registro policy e `canExecute` per l’esecuzione dei plugin.
- **CapabilityGovernance** (`src/core/plugins/capability/CapabilityGovernance.ts`): registro policy e `canUseCapability` per le capability.
- **TenantGovernance** (`src/core/plugins/tenant/TenantGovernance.ts`): registro policy e `canExecute` per tenant e compliance.
- **SecurityAuditDispatcher** (`src/core/plugins/audit/SecurityAuditDispatcher.ts`): registro sink e dispatch eventi di audit.
- **FeatureToggleService** (`src/platform/features/FeatureToggleService.ts`): risoluzione feature abilitate e `getEnabledFeatureKeys` per il contesto di attivazione.

Supporto di contesto e decisioni:

- **PluginActivationContext** (governance): apiVersion, environment, features, timestamp, tenant opzionale.
- **SecurityAuditEvent** (audit): evento normalizzato per DENY/ALLOW, layer, reason, capability, tenantId, environment, apiVersion.

La verifica del comportamento è coperta da **test automatici** (Vitest) per runtime, governance, capability, tenant, feature toggle e audit, senza dipendenze da tool operativi o da API esterne.

---

## 5. Decisione del Gate

| Campo | Valore |
|-------|--------|
| **Stato finale** | **PASS** |
| **Motivazione** | Tutti i boundary di sicurezza previsti dal Gate 5.4 sono implementati, enforced e verificati da test. Governance, capability, multi-tenant e audit sono integrati nel runtime in modo deterministico e fail-safe. Le decisioni sono spiegabili e gli eventi di audit sono immutabili e serializzabili. Nessun bypass di esecuzione plugin al di fuori del runtime; nessun accesso diretto a tenant, feature toggle o capability da parte dei plugin. |

Il sistema soddisfa i requisiti di sicurezza, governance e compliance previsti dal Gate 5.4.  
Tutti i boundary sono enforced, auditabili e testati.  
La piattaforma è pronta per la **Fase 5.5 — Operationalization**.
