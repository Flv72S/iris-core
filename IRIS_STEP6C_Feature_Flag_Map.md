# IRIS — STEP 6C: Feature Flag Map

## Scopo

Introdurre feature flags **deterministici, auditabili, fail-closed** applicati **solo** come guard al bordo HTTP, senza modificare Core/Boundary/semantica.

---

## Feature Flag Registry (centralizzato)

File: `src/runtime/featureFlags/FeatureFlagRegistry.ts`

Ogni flag definisce:
- **key**
- **description**
- **endpoints[]** (prefix match)

### Flag supportate

| Flag Key | Default (se mancante) | Endpoint protetti (prefix) | Descrizione |
|---|---:|---|---|
| `FEATURE_THREADS_ENABLED` | OFF | `/threads/*` | Abilita endpoint threads/messages (prefix `/threads`). |
| `FEATURE_SYNC_ENABLED` | OFF | `/sync/*` | Abilita endpoint sync (prefix `/sync`). |

**Nota fail-closed**: flag mancante in env ⇒ OFF.

---

## Loader (env → state map immutabile)

File: `src/runtime/featureFlags/loadFeatureFlags.ts`

Regole:
- Valori ammessi: `true` \| `false`
- Manca in env ⇒ `false` (OFF)
- Valore invalido ⇒ **abort startup** (throw)
- Output: mappa immutabile (`Object.freeze`)

Audit:
- `getFeatureFlagAudit(flags)` produce elenco centralizzato con stato ON/OFF.

---

## Feature Guard Middleware

File: `src/api/http/middleware/featureGuard.ts`

Comportamento:
- Se request matcha un endpoint protetto
  - flag OFF ⇒ **404** (non 403/401)
  - flag ON ⇒ pass-through
- Nessun coupling con preview mode
- Nessuna mutazione runtime

Logging:
- Log info strutturato con `reason: feature_off`, `correlationId`, `ip`, `path`, `flag`.

---

## Integrazione HTTP Server

File: `src/api/http/server.ts`

Ordine middleware (onRequest):
1. Correlation ID
2. Preview guard (se `PREVIEW_MODE=true`)
3. Feature guard
4. Routing

---

## Env

Aggiornati:
- `.env.example`
- `.env.preview.example`

Nuove variabili:
- `FEATURE_THREADS_ENABLED=true|false`
- `FEATURE_SYNC_ENABLED=true|false`

---

## Test bloccanti

Directory: `src/runtime/tests/`

- `feature-flag-off.test.ts`: OFF ⇒ 404, missing ⇒ OFF
- `feature-flag-on.test.ts`: ON ⇒ comportamento invariato
- `feature-flag-invalid.test.ts`: invalido ⇒ throw (abort startup)

---

## Vincoli rispettati

- ✅ Core ignaro dei flag (nessuna modifica/import)
- ✅ Boundary invariata
- ✅ Fail-closed (missing ⇒ OFF)
- ✅ Config-driven (solo `process.env`)
- ✅ Per-endpoint (prefix)
- ✅ Auditabilità (registry + audit output)
- ✅ Nessuna persistenza / mutazione runtime / A/B / percentuali

