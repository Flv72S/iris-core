# IRIS — STEP 6B: Checklist Bloccante

## Verdetto: PASS / FAIL (Binario)

---

## ✅ 1. Preview Access Token

- [x] **PASS**: `src/api/http/middleware/previewAuth.ts` implementato
- [x] **PASS**: Token verificato su ogni request HTTP
- [x] **PASS**: Esclusioni per `/health` e `/ready`
- [x] **PASS**: Header `X-Preview-Token` richiesto
- [x] **PASS**: HTTP 401 se token mancante o errato
- [x] **PASS**: Log strutturato (level: warn) per violazioni
- [x] **PASS**: Nessuna informazione sensibile in risposta

**Test**: `preview-auth.test.ts` → ✅ **PASS**

**Verdetto**: ✅ **PASS**

---

## ✅ 2. Rate Limiting (Preview Only)

- [x] **PASS**: `src/api/http/middleware/previewRateLimit.ts` implementato
- [x] **PASS**: Rate limit in-memory per IP
- [x] **PASS**: Applicato solo se `PREVIEW_MODE=true`
- [x] **PASS**: Default 60 req/min configurabile via `PREVIEW_RATE_LIMIT_RPM`
- [x] **PASS**: HTTP 429 su superamento limite
- [x] **PASS**: Header `Retry-After` incluso
- [x] **PASS**: Log strutturato (level: warn)
- [x] **PASS**: Esclusioni per `/health` e `/ready`

**Test**: `preview-rate-limit.test.ts` → ✅ **PASS**

**Verdetto**: ✅ **PASS**

---

## ✅ 3. Preview Mode Banner

- [x] **PASS**: `src/api/http/middleware/previewBanner.ts` implementato
- [x] **PASS**: Header `X-IRIS-Mode: PREVIEW` aggiunto a ogni risposta
- [x] **PASS**: Attivo solo se `PREVIEW_MODE=true`
- [x] **PASS**: Disattivabile via config

**Test**: `preview-guard.test.ts` → ✅ **PASS**

**Verdetto**: ✅ **PASS**

---

## ✅ 4. Endpoint Allowlist

- [x] **PASS**: `src/api/http/middleware/previewAllowlist.ts` implementato
- [x] **PASS**: Allowlist: `/health`, `/ready`, `/threads`, `/sync`
- [x] **PASS**: Richieste fuori allowlist → HTTP 404 (non 403)
- [x] **PASS**: Log strutturato (level: info)
- [x] **PASS**: Attivo solo se `PREVIEW_MODE=true`

**Test**: `preview-guard.test.ts` → ✅ **PASS**

**Verdetto**: ✅ **PASS**

---

## ✅ 5. Preview Guard (Composizione)

- [x] **PASS**: `src/api/http/middleware/previewGuard.ts` implementato
- [x] **PASS**: Compone tutti i controlli preview
- [x] **PASS**: Ordine: Correlation ID → Banner → Allowlist → Access Token → Rate Limit
- [x] **PASS**: Applicazione globale nel bootstrap HTTP
- [x] **PASS**: Attivo solo se `PREVIEW_MODE=true`

**Test**: `preview-guard.test.ts` → ✅ **PASS**

**Verdetto**: ✅ **PASS**

---

## ✅ 6. Configurazione Runtime

- [x] **PASS**: `src/api/http/middleware/previewConfig.ts` implementato
- [x] **PASS**: Env vars: `PREVIEW_MODE`, `PREVIEW_ACCESS_TOKEN`, `PREVIEW_RATE_LIMIT_RPM`
- [x] **PASS**: Validazione config integrata
- [x] **PASS**: Fail-fast se `PREVIEW_MODE=true` e token mancante
- [x] **PASS**: `.env.example` aggiornato
- [x] **PASS**: `.env.preview.example` aggiornato

**Verdetto**: ✅ **PASS**

---

## ✅ 7. Integrazione HTTP Server

- [x] **PASS**: Preview guard integrato in `src/api/http/server.ts`
- [x] **PASS**: Guard registrato dopo Correlation ID
- [x] **PASS**: Attivo solo se `PREVIEW_MODE=true`

**Verdetto**: ✅ **PASS**

---

## ✅ 8. Integrazione Bootstrap

- [x] **PASS**: Preview config validata in `src/app/main.ts`
- [x] **PASS**: Fail-fast se `PREVIEW_MODE=true` e token mancante
- [x] **PASS**: Validazione eseguita prima del bootstrap

**Verdetto**: ✅ **PASS**

---

## ✅ 9. Test Bloccanti

- [x] **PASS**: `src/runtime/tests/preview-auth.test.ts` creato
- [x] **PASS**: `src/runtime/tests/preview-rate-limit.test.ts` creato
- [x] **PASS**: `src/runtime/tests/preview-guard.test.ts` creato
- [x] **PASS**: Test verificano accesso senza token → 401
- [x] **PASS**: Test verificano accesso con token errato → 401
- [x] **PASS**: Test verificano accesso con token valido → 200
- [x] **PASS**: Test verificano rate limit attivo → 429
- [x] **PASS**: Test verificano header preview presente
- [x] **PASS**: Test verificano health/readiness NON bloccati

**Verdetto**: ✅ **PASS**

---

## ✅ 10. Logging & Observability

- [x] **PASS**: Tutti i blocchi preview loggano correlationId
- [x] **PASS**: Tutti i blocchi preview loggano IP
- [x] **PASS**: Tutti i blocchi preview loggano reason (auth_fail, rate_limit, not_allowed)
- [x] **PASS**: Nessun log sensibile
- [x] **PASS**: Livelli corretti (warn per violazioni, info per allowlist drop)

**Verdetto**: ✅ **PASS**

---

## ✅ 11. Nessuna modifica a Core/Boundary/Repository

- [x] **PASS**: `src/api/core/**` NON modificato
- [x] **PASS**: `src/api/boundary/**` NON modificato
- [x] **PASS**: `src/api/repositories/**` NON modificato
- [x] **PASS**: Contratti NON modificati
- [x] **PASS**: API semantics NON modificate

**Verdetto**: ✅ **PASS**

---

## ✅ 12. Disattivazione via Config

- [x] **PASS**: Tutti i controlli preview disattivabili via `PREVIEW_MODE=false`
- [x] **PASS**: Comportamento identico a pre-STEP 6B quando disattivato
- [x] **PASS**: Nessun valore hardcoded

**Verdetto**: ✅ **PASS**

---

## ✅ 13. Documentazione completa

- [x] **PASS**: `IRIS_STEP6B_Preview_Access_Model.md` creato
- [x] **PASS**: `IRIS_STEP6B_Checklist_Bloccante.md` creato
- [x] **PASS**: `IRIS_STEP6B_Completamento_v1.0.md` creato

**Verdetto**: ✅ **PASS**

---

## 🎯 VERDETTO FINALE

### ✅ **PASS**

Tutti i criteri bloccanti sono soddisfatti.

Sistema accessibile solo a soggetti autorizzati in preview mode.

Sistema protetto da abuso accidentale.

Sistema chiaramente identificabile come preview.

Pronto per esposizione esterna controllata.

---

## Note

- Verifica eseguita: 2026-01-26
- Test eseguiti: ✅ Tutti PASS
- Documentazione: ✅ Completa
- Rischio residuo: ⚠️ Nessuno (vedi `IRIS_STEP6B_Completamento_v1.0.md`)
