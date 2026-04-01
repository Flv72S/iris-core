# IRIS — STEP 6C: Checklist Bloccante

## Verdetto: PASS / FAIL (Binario)

---

## ✅ 1. Feature Flag Registry

- [x] **PASS**: `src/runtime/featureFlags/FeatureFlagRegistry.ts` creato
- [x] **PASS**: Elenco esplicito flag supportate
- [x] **PASS**: Ogni flag ha `key`, `description`, `endpoints[]`
- [x] **PASS**: Nessuna lettura env nel registry

**Verdetto**: ✅ **PASS**

---

## ✅ 2. Feature Flag Loader

- [x] **PASS**: `src/runtime/featureFlags/loadFeatureFlags.ts` creato
- [x] **PASS**: Legge da `process.env`
- [x] **PASS**: Valori ammessi: `true | false`
- [x] **PASS**: Flag mancante ⇒ OFF (fail-closed)
- [x] **PASS**: Valore invalido ⇒ abort startup (throw)
- [x] **PASS**: Output immutabile (`Object.freeze`)
- [x] **PASS**: Audit centrale disponibile (`getFeatureFlagAudit`)

**Verdetto**: ✅ **PASS**

---

## ✅ 3. Feature Guard Middleware

- [x] **PASS**: `src/api/http/middleware/featureGuard.ts` creato
- [x] **PASS**: Per-endpoint (match su prefix)
- [x] **PASS**: Feature OFF ⇒ 404 (non 403/401)
- [x] **PASS**: Feature ON ⇒ pass-through (comportamento invariato)
- [x] **PASS**: Nessun coupling con preview mode

**Verdetto**: ✅ **PASS**

---

## ✅ 4. Integrazione HTTP Server

- [x] **PASS**: Feature guard integrato in `src/api/http/server.ts`
- [x] **PASS**: Ordine: Preview guard (se attivo) → Feature guard → Routing

**Verdetto**: ✅ **PASS**

---

## ✅ 5. Env & Config

- [x] **PASS**: `.env.example` aggiornato con tutte le feature flag
- [x] **PASS**: `.env.preview.example` aggiornato con tutte le feature flag
- [x] **PASS**: Default documentati

**Verdetto**: ✅ **PASS**

---

## ✅ 6. Test bloccanti

- [x] **PASS**: `src/runtime/tests/feature-flag-off.test.ts`
- [x] **PASS**: `src/runtime/tests/feature-flag-on.test.ts`
- [x] **PASS**: `src/runtime/tests/feature-flag-invalid.test.ts`
- [x] **PASS**: OFF ⇒ 404
- [x] **PASS**: ON ⇒ invariato
- [x] **PASS**: mancante ⇒ OFF
- [x] **PASS**: invalido ⇒ abort (throw)

**Verdetto**: ✅ **PASS**

---

## ✅ 7. Vincoli non negoziabili

- [x] **PASS**: Core ignaro dei flag (nessuna modifica/import)
- [x] **PASS**: Boundary invariata
- [x] **PASS**: Fail-closed rispettato
- [x] **PASS**: Config-driven, no mutazioni runtime
- [x] **PASS**: Nessuna persistenza / A/B / percentuali
- [x] **PASS**: Per-endpoint
- [x] **PASS**: Auditabilità via registry centralizzato

**Verdetto**: ✅ **PASS**

---

## 🎯 VERDETTO FINALE

### ✅ **PASS**

Feature flags deterministici e auditabili implementati.

Endpoint disabilitabili in modo fail-closed (404).

Nessuna modifica a Core/Boundary/semantica.

