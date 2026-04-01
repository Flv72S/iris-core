# IRIS - Preview Rollback & Failure Modes

## Comportamento in Caso di Errori

Questo documento descrive il comportamento deterministico di IRIS in caso di errori e come gestire rollback.

---

## Failure Modes

### 1. SQLite Non Accessibile

**Scenario**: SQLite file path non accessibile o permessi insufficienti.

**Comportamento**:
- Startup fallisce immediatamente con errore esplicito
- Log strutturato con errore SQLite
- Processo termina con exit code 1

**Log esempio**:
```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-xxx",
  "message": "Failed to start IRIS application",
  "context": {
    "error": "SQLITE_CANTOPEN: unable to open database file"
  }
}
```

**Risoluzione**:
1. Verificare permessi directory `/data` (in container)
2. Verificare che volume Docker sia montato correttamente
3. Verificare che SQLITE_FILE_PATH sia corretto

**Rollback**: Non necessario, applicazione non parte.

---

### 2. Porta Occupata

**Scenario**: Porta HTTP già in uso.

**Comportamento**:
- Startup fallisce durante bind porta
- Log strutturato con errore EADDRINUSE
- Processo termina con exit code 1

**Log esempio**:
```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "http",
  "correlationId": "corr-xxx",
  "message": "Failed to start HTTP server",
  "context": {
    "port": 3000,
    "error": "Error: listen EADDRINUSE: address already in use :::3000"
  }
}
```

**Risoluzione**:
1. Verificare processo esistente sulla porta: `lsof -i :3000`
2. Cambiare porta via env: `HTTP_PORT=3001`
3. Terminare processo esistente se necessario

**Rollback**: Non necessario, applicazione non parte.

---

### 3. Env Variabili Mancanti

**Scenario**: Variabili d'ambiente richieste mancanti.

**Comportamento**:
- Config validation fallisce (fail-fast)
- Log strutturato con errore di validazione
- Processo termina con exit code 1

**Log esempio**:
```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-xxx",
  "message": "Failed to start IRIS application",
  "context": {
    "error": "Config validation failed: http.port - must be a number (value: undefined)"
  }
}
```

**Risoluzione**:
1. Verificare file `.env` o `.env.preview`
2. Copiare da `.env.example` o `.env.preview.example`
3. Impostare variabili richieste

**Rollback**: Non necessario, applicazione non parte.

---

### 4. Config Invalida (Range)

**Scenario**: Valori di configurazione fuori range.

**Comportamento**:
- Config validation fallisce (fail-fast)
- Log strutturato con errore di validazione
- Processo termina con exit code 1

**Log esempio**:
```json
{
  "timestamp": "2026-01-26T10:00:00.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-xxx",
  "message": "Failed to start IRIS application",
  "context": {
    "error": "Config validation failed: http.port - must be <= 65535 (value: 70000)"
  }
}
```

**Risoluzione**:
1. Correggere valore in env
2. Verificare range valido (port: 1-65535)

**Rollback**: Non necessario, applicazione non parte.

---

### 5. Shutdown Timeout

**Scenario**: Shutdown non completa entro timeout.

**Comportamento**:
- Shutdown inizia normalmente
- Se timeout superato, processo termina forzatamente
- Log strutturato con errore timeout

**Log esempio**:
```json
{
  "timestamp": "2026-01-26T10:05:10.000Z",
  "level": "error",
  "service": "iris-api",
  "component": "bootstrap",
  "correlationId": "corr-xxx",
  "message": "Shutdown timeout exceeded, forcing exit",
  "context": {
    "timeoutMs": 10000
  }
}
```

**Risoluzione**:
1. Verificare perché shutdown è lento (DB lock, connessioni aperte)
2. Aumentare timeout via env: `SHUTDOWN_TIMEOUT_MS=20000`
3. Verificare che tutti gli handler completino correttamente

**Rollback**: Non necessario, applicazione già in shutdown.

---

## Come Fermare l'Applicazione in Sicurezza

### Metodo 1: SIGTERM (Raccomandato)

```bash
# Invia SIGTERM al processo
kill -TERM <PID>

# O tramite Docker
docker stop iris-preview
```

**Comportamento**:
- Shutdown graceful avviato
- Tutti gli handler eseguiti in ordine
- Timeout applicato se necessario

### Metodo 2: SIGINT

```bash
# Invia SIGINT al processo (Ctrl+C)
kill -INT <PID>
```

**Comportamento**: Identico a SIGTERM.

### Metodo 3: SIGKILL (Solo in Emergenza)

```bash
# Forza terminazione immediata
kill -9 <PID>

# O tramite Docker
docker kill iris-preview
```

**Comportamento**:
- Terminazione immediata
- Nessun cleanup
- Possibile perdita di stato se in scrittura

**⚠️ Usare solo se necessario, può causare corruzione dati SQLite.**

---

## Come Ripristinare una Versione Precedente

### Metodo 1: Docker (Raccomandato)

```bash
# 1. Ferma container corrente
docker stop iris-preview

# 2. Rimuovi container (opzionale, mantiene volume)
docker rm iris-preview

# 3. Build immagine versione precedente
docker build -f Dockerfile.preview -t iris-preview:v1.0.0 .

# 4. Avvia container con versione precedente
docker-compose -f docker-compose.preview.yml up -d
```

### Metodo 2: Git + Rebuild

```bash
# 1. Ferma applicazione
docker stop iris-preview

# 2. Checkout versione precedente
git checkout <tag-version>

# 3. Rebuild
docker build -f Dockerfile.preview -t iris-preview:previous .

# 4. Avvia
docker-compose -f docker-compose.preview.yml up -d
```

### Metodo 3: Backup SQLite (Se Applicabile)

```bash
# 1. Backup database corrente
docker exec iris-preview cp /data/iris.db /data/iris.db.backup

# 2. Ferma applicazione
docker stop iris-preview

# 3. Ripristina versione precedente (vedi Metodo 1 o 2)

# 4. Se necessario, ripristina database
docker exec iris-preview cp /data/iris.db.backup /data/iris.db
```

---

## Stato Persistente

### SQLite Database

- **Location**: `/data/iris.db` (in container)
- **Volume**: `iris-data` (Docker volume)
- **Backup**: Copiare file da volume Docker

### Nessun Altro Stato

- Nessun file di configurazione runtime
- Nessun cache
- Nessun lock file

---

## Verifica Post-Rollback

Dopo rollback, verificare:

1. **Health Check**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Readiness Check**:
   ```bash
   curl http://localhost:3000/ready
   ```

3. **Logs**:
   ```bash
   docker logs iris-preview
   ```

4. **Database**:
   ```bash
   docker exec iris-preview ls -la /data/
   ```

---

## Note Finali

- **Fail-Fast**: IRIS non parte se configurato male
- **Deterministico**: Comportamento prevedibile in tutti i casi
- **Observable**: Tutti gli errori loggati strutturati
- **Recoverable**: Rollback semplice e controllato
