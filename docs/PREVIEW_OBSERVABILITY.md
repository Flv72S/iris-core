# IRIS Preview - Observability Guide

## Logging Strutturato

Tutti i log in ambiente preview sono in formato JSON strutturato.

### Formato Log

Ogni log entry contiene:
- `timestamp`: ISO 8601 timestamp
- `level`: `debug` | `info` | `warn` | `error`
- `service`: `"iris-api"`
- `component`: `http` | `boundary` | `repository` | `bootstrap` | `observability`
- `correlationId`: ID univoco per tracciamento
- `message`: Messaggio descrittivo
- `context`: Oggetto opzionale con contesto aggiuntivo

### Esempio Log di Startup

```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "info",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "preview-startup",
  "message": "Starting IRIS preview deployment",
  "context": {
    "environment": "preview",
    "persistence": "sqlite",
    "httpPort": 3000,
    "sqlitePath": "/data/iris.db",
    "logLevel": "info",
    "shutdownTimeoutMs": 10000
  }
}
```

```json
{
  "timestamp": "2026-01-26T10:00:01.000Z",
  "level": "info",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-1234567890-abc",
  "message": "Starting IRIS application",
  "context": {
    "persistence": "sqlite",
    "httpPort": 3000,
    "sqlitePath": "/data/iris.db"
  }
}
```

```json
{
  "timestamp": "2026-01-26T10:00:02.000Z",
  "level": "info",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-1234567890-abc",
  "message": "IRIS application started",
  "context": {
    "port": 3000
  }
}
```

### Esempio Log di Errore Config

```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "preview-startup",
  "message": "Missing required environment variables",
  "context": {
    "missing": ["HTTP_PORT", "PERSISTENCE"]
  }
}
```

```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-1234567890-abc",
  "message": "Config validation failed: http.port - must be >= 1",
  "context": {
    "field": "http.port",
    "reason": "must be >= 1",
    "value": -1
  }
}
```

### Esempio Log di Request HTTP

```json
{
  "timestamp": "2026-01-26T10:00:05.000Z",
  "level": "info",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-1234567890-def",
  "message": "Request started",
  "context": {
    "method": "POST",
    "url": "/threads/123/messages"
  }
}
```

```json
{
  "timestamp": "2026-01-26T10:00:05.100Z",
  "level": "info",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-1234567890-def",
  "message": "Request completed",
  "context": {
    "method": "POST",
    "url": "/threads/123/messages",
    "statusCode": 201,
    "responseTime": 100
  }
}
```

### Esempio Log di Errore Runtime

```json
{
  "timestamp": "2026-01-26T10:00:10.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-1234567890-ghi",
  "message": "TypeError: Cannot read property 'x' of undefined",
  "context": {
    "errorCode": "TypeError",
    "source": "http",
    "visibility": "INTERNAL",
    "method": "POST",
    "url": "/threads/123/messages",
    "errorStack": "TypeError: Cannot read property 'x' of undefined\n    at ..."
  }
}
```

## Correlation ID

Ogni request HTTP genera un correlation ID univoco che viene:
- Aggiunto a request header (`x-correlation-id`)
- Aggiunto a response header (`x-correlation-id`)
- Incluso in tutti i log relativi alla request

### Tracciamento End-to-End

Per tracciare una request end-to-end:
1. Cattura `x-correlation-id` dalla response HTTP
2. Cerca nei log tutte le entry con quel `correlationId`
3. Ordina per `timestamp` per vedere il flusso completo

## Health & Readiness

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T10:00:00.000Z"
}
```

### Readiness Check

```bash
curl http://localhost:3000/ready
```

Response (ready):
```json
{
  "status": "ready",
  "timestamp": "2026-01-26T10:00:00.000Z",
  "persistence": {
    "initialized": true,
    "type": "sqlite"
  },
  "boundary": {
    "operational": true
  }
}
```

Response (not ready):
```json
{
  "status": "not ready",
  "timestamp": "2026-01-26T10:00:00.000Z",
  "persistence": {
    "initialized": false,
    "type": "unknown"
  },
  "boundary": {
    "operational": false
  },
  "errors": [
    "Persistence check failed: ..."
  ]
}
```

## Monitoring in Preview

### Log Aggregation

I log JSON possono essere aggregati con:
- `jq` per parsing locale
- ELK stack per aggregazione centralizzata
- CloudWatch / Datadog per monitoring cloud

### Esempio: Filtro Log per Correlation ID

```bash
docker logs iris-preview | jq 'select(.correlationId == "corr-1234567890-abc")'
```

### Esempio: Conta Errori

```bash
docker logs iris-preview | jq 'select(.level == "error")' | wc -l
```
