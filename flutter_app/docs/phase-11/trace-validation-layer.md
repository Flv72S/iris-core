# Phase 11.2.3 — Trace Validation Layer

## Ruolo

Il Trace Validation Layer riceve DecisionTraceDto dal channel, verifica integrità strutturale, coerenza hash (se fornito) e compatibilità versione contratto. Espone solo trace formalmente validi. Nessuna logica decisionale.

## Sicurezza formale

- validateStructure / validateStructureFromMap: campi obbligatori e tipi.
- validateHash: hash deterministico vs atteso (SHA-256 canonico).
- validateContractVersion: versione vs irisBridgeContractVersion.

Nessun DateTime.now(), Random, fallback. Stessi input stesso esito.

## Separazione da Core

Solo controlli formali. ValidatedTraceResult (trace, isValid, errors) o TraceValidationException. Esecuzione e decisioni restano nel Core.

## Auditabilità

Messaggi deterministici; ValidatedTraceResult immutabile; hash verificabile; contratto versionato.

## File

lib/bridge/validation/trace_validator.dart, validated_trace_result.dart, trace_validation_exception.dart.
