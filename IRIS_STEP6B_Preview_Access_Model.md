# IRIS — STEP 6B: Preview Access Model

## Scopo

Definire il modello di accesso per ambiente PREVIEW, garantendo che:
- l'accesso sia limitato a soggetti autorizzati
- il sistema non sia abusabile
- lo stato PREVIEW sia chiaramente identificabile
- il sistema sia sicuro per esposizione esterna controllata

---

## Regole di Accesso

### Endpoint Pubblici (Sempre Accessibili)

Questi endpoint sono **sempre accessibili** anche in preview mode:

- `/health` - Health check (liveness)
- `/ready` - Readiness check

**Motivazione**: Necessari per monitoring e orchestrazione (Kubernetes, Docker, ecc.)

---

### Endpoint Protetti (Richiedono Token)

In preview mode, questi endpoint richiedono token valido:

- `/threads/*` - Tutti gli endpoint thread
- `/sync/*` - Tutti gli endpoint sync

**Header richiesto**: `X-Preview-Token: <token>`

**Comportamento**:
- Token mancante → HTTP 401
- Token errato → HTTP 401
- Token valido → Richiesta processata

---

### Endpoint Bloccati (Non Consentiti)

In preview mode, endpoint non in allowlist sono bloccati:

- Qualsiasi path non in `/health`, `/ready`, `/threads`, `/sync`

**Comportamento**:
- HTTP 404 (non 403)
- Log strutturato (level: info)

**Motivazione**: Safety net per prevenire accesso accidentale a endpoint non previsti.

---

## Preview Mode Indicator

### Header Response

Ogni risposta HTTP in preview mode include:

```
X-IRIS-Mode: PREVIEW
```

**Motivazione**: Identificazione esplicita che il sistema è in preview.

---

## Rate Limiting

### Configurazione

- **Default**: 60 richieste/minuto per IP
- **Configurabile**: `PREVIEW_RATE_LIMIT_RPM`
- **Applicato**: Solo se `PREVIEW_MODE=true`
- **Esclusioni**: `/health`, `/ready`

### Comportamento

- Superamento limite → HTTP 429
- Header `Retry-After` incluso
- Log strutturato (level: warn)

---

## Access Token

### Configurazione

- **Token**: Fornito via env `PREVIEW_ACCESS_TOKEN`
- **Richiesto**: Solo se `PREVIEW_MODE=true`
- **Validazione**: Fail-fast all'avvio se mancante

### Header

```
X-Preview-Token: <token>
```

### Comportamento

- Token mancante → HTTP 401
- Token errato → HTTP 401
- Token valido → Richiesta processata
- Log strutturato per violazioni (level: warn)

---

## Ordine di Esecuzione Middleware

Il Preview Guard esegue in ordine:

1. **Correlation ID** (già presente nel server)
2. **Preview Mode Check** (abilita/disabilita guard)
3. **Banner** (aggiunge `X-IRIS-Mode: PREVIEW`)
4. **Allowlist** (blocca path non permessi con 404)
5. **Access Token** (verifica token)
6. **Rate Limit** (verifica limite per IP)

**Nota**: Allowlist prima di Access Token per evitare log token su path non permessi.

---

## Cosa è Protetto

### ✅ Protetto in Preview Mode

- Tutti gli endpoint `/threads/*`
- Tutti gli endpoint `/sync/*`
- Rate limiting per IP
- Allowlist enforcement

### ❌ NON Protetto (Sempre Pubblici)

- `/health` - Health check
- `/ready` - Readiness check

---

## Cosa NON è Implementato

### ❌ Auth Utente Finale

- Nessuna autenticazione utente
- Nessun RBAC
- Nessuna persistenza auth

### ❌ Feature Business

- Nessuna feature nuova
- Nessuna modifica semantica API

---

## Configurazione

### Env Variables

```bash
# Abilita preview mode
PREVIEW_MODE=true

# Token di accesso (richiesto se PREVIEW_MODE=true)
PREVIEW_ACCESS_TOKEN=your-secret-token

# Rate limit per minuto (default: 60)
PREVIEW_RATE_LIMIT_RPM=60
```

### Validazione

- Se `PREVIEW_MODE=true` e `PREVIEW_ACCESS_TOKEN` mancante → **startup failure**
- Validazione fail-fast in `main.ts`

---

## Disattivazione

Preview mode può essere disattivato:

```bash
PREVIEW_MODE=false
```

Quando disattivato:
- Nessun controllo access token
- Nessun rate limiting
- Nessun header `X-IRIS-Mode`
- Nessun allowlist enforcement

**Comportamento**: Identico a pre-STEP 6B.

---

## Logging & Observability

### Log Strutturati

Tutti i blocchi preview loggano:

```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "warn",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-xxx",
  "message": "Preview auth failed",
  "context": {
    "reason": "auth_fail",
    "ip": "1.2.3.4",
    "path": "/threads/123/messages"
  }
}
```

### Livelli Log

- **warn**: Violazioni (auth fail, rate limit)
- **info**: Allowlist drop

### Nessun Log Sensibile

- Token non loggato
- Nessun secret esposto

---

## Riferimenti Vincolanti

- `IRIS_STEP6B_Checklist_Bloccante.md` - Checklist verifica
- `IRIS_STEP6B_Completamento_v1.0.md` - Verdetto finale
- `src/api/http/middleware/previewGuard.ts` - Implementazione guard

---

## Note Finali

Preview Access Control è implementata come **infrastruttura additiva**.

Nessuna modifica a Core, Boundary, Repository, API semantics.

Sistema accessibile solo a soggetti autorizzati in preview mode.

Pronto per esposizione esterna controllata.
