# Resolution Audit — Specifica (Microstep 6.5.4)

**Status:** Engineering specification  
**Implementazione:** `src/core/resolution/resolution-audit.ts`

---

## 1. Formato log

Ogni entry di audit è un **ResolutionAuditEntry** immutabile. Struttura:

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| resolutionId | string | Identificatore univoco della risoluzione |
| featureId | string | Feature coinvolta |
| executionRequestId | string \| null | Correlazione con Execution ID (Fase 7); null se non correlata |
| status | ResolutionStatus | ALLOWED \| BLOCKED \| FORCED \| SUSPENDED |
| winningAuthorityId | AuthoritySourceId \| null | Authority vincente; null se status ALLOWED |
| winningRuleId | string \| null | Regola che ha emesso la decisione vincente |
| reason | string \| null | Motivo deterministico |
| resolvedAt | number | Timestamp di risoluzione (es. context.now) |
| decisionsSnapshot | readonly AuthorityDecisionSnapshot[] | Copia ordinata di tutte le decisioni (replay) |
| payloadHash | string | Hash deterministico del payload (64 caratteri esadecimali se SHA-like) |

**AuthorityTraceStep** (singolo step della trace):

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| stepIndex | number | Indice nell'ordine di valutazione |
| authorityId | AuthoritySourceId | Authority valutata |
| status | AuthorityStatus | Esito di quella authority |
| ruleId | string \| null | Regola applicata |
| reason | string \| null | Motivo |
| terminated | boolean | true se la risoluzione è terminata dopo questo step |

Log = sequenza append-only di ResolutionAuditEntry. Nessuna modifica o cancellazione dopo l'append.

---

## 2. Serializer stabile

- **serializeAuditEntry(entry): string** — Serializzazione canonica (chiavi in ordine fissato). Stesso entry → stessa stringa. Encoding UTF-8.
- **deserializeAuditEntry(json): ResolutionAuditEntry** — Parsing e freeze; restituisce entry immutabile. Utilizzo: persistenza, trasmissione, replay.

Ordine chiavi: resolutionId, featureId, executionRequestId, status, winningAuthorityId, winningRuleId, reason, resolvedAt, decisionsSnapshot, payloadHash.

---

## 3. Hashing deterministico SHA-like

- **hashShaLike(payload: string): string** — Hash deterministico a 64 caratteri esadecimali. Stesso input → stesso output. Nessuna dipendenza da crypto runtime.
- **hashAuditEntryPayload(entry): string** — Applica hashShaLike al JSON canonico dell'entry (senza il campo payloadHash). Utilizzo: payloadHash in entry, verifica integrità, Fase 13.

Compatibilità: in ambienti con crypto (Node/Web) è possibile sostituire hashShaLike con SHA-256 mantenendo lo stesso input (canonical JSON); l'output sarebbe allora 64 hex di SHA-256.

---

## 4. Replay procedure

1. **Input:** Una o più ResolutionAuditEntry (da readResolutionAudit o da deserializeAuditEntry su log persistito).
2. **Verifica integrità:** Ricalcolare payloadHash con hashAuditEntryPayload sull'entry senza payloadHash; confrontare con entry.payloadHash. Se diverso, payload alterato.
3. **Ricostruzione contesto:** Da entry.decisionsSnapshot, resolutionId, featureId, resolvedAt (e opz. executionRequestId) costruire un ResolutionContext equivalente (authorityDecisions = decisionsSnapshot, now = resolvedAt, ecc.).
4. **Riesecuzione:** Chiamare resolve(context). Il risultato deve avere stesso status, winningAuthorityId, winningRuleId della entry originale.
5. **Verifica hash:** Il nuovo auditEntry.payloadHash (calcolato con lo stesso algoritmo) deve coincidere con quello della entry originale.

Replay completo = possibilità di riprodurre l'esito e verificare l'integrità a partire solo dai log.

---

## 5. Audit post-mortem

- **Correlazione con Execution ID (Fase 7):** Filtrare entry per executionRequestId per ottenere tutte le risoluzioni legate a una data richiesta di execution. Trace: execution request → resolution(s) → winning authority e status.
- **Ricerca per resolutionId:** Recupero della singola risoluzione e del suo decisionsSnapshot.
- **Ricerca per featureId:** Tutte le risoluzioni relative a una feature.
- **Analisi temporale:** Ordinamento per resolvedAt (ordine di append = ordine temporale).

Nessuna aggregazione a livello di specifica; solo lettura e filtro su entry atomiche.

---

## 6. Compatibilità compliance (Fase 13)

- **Determinism Certification:** payloadHash permette di attestare che il payload non è stato alterato. Ricalcolo con hashAuditEntryPayload e confronto con payloadHash registrato.
- **Replay certificabile:** Stesso ResolutionContext (ricostruito da entry) → stesso ResolutionResult; verificabile rieseguendo resolve() e confrontando status e hash.
- **Immutabilità:** Entry congelate dopo append; nessuna mutazione dello store in produzione. Reset consentito solo in test (_resetResolutionAuditForTest).
- **Serializer stabile:** Ordine chiavi e formato canonico fissi; versioni future devono mantenere compatibilità o incrementare versione del formato.

---

## 7. Riferimenti

- Data model: resolution-engine-data-model.md
- Audit spec: resolution-audit-spec.md
- Resolution engine: resolution-engine.ts
