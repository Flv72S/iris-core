# Phase 11.3.1 — Explainability Surface Contract

## Ruolo

Contratto formale UI per explainability: DecisionTraceDto + ExplanationDto → ExplainabilityViewModel (1-to-1, nessuna interpretazione). Unica fonte dati certificata per schermate explainability.

## Separazione

Core decide e produce trace/explanation; UI rappresenta solo i dati tramite mapper puro e ViewModel immutabile. Validator controlli formali (campi non vuoti).

## Garanzie

Mapper senza default/fallback; ViewModel senza logica; nessun DateTime/Random. Auditabile e deterministico.

## File

lib/ui/explainability_contract/: explainability_view_model, explainability_mapper, explainability_contract_validator, explainability_validation_result.
