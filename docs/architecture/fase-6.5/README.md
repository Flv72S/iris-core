# Fase 6.5 — Preference Resolution & Authority Layer

Documentazione engineering per il **Resolution Engine**: data model, state machine, gerarchia delle authority, audit e casi di test.

## File

| File | Contenuto |
|------|-----------|
| resolution-engine-data-model.md | ResolutionContext, AuthorityDecision, ResolutionResult, ResolutionAuditEntry; proprietà formali; esempi JSON; mapping Fase 7, 10, 13 |
| resolution-state-machine.md | Stati, eventi, tabella di transizione, pseudocodice, terminalità anticipata, proprietà verificabili |
| authority-hierarchy-spec.md | Ordine fisso WELLBEING → GUARDRAIL → FEATURE_POLICY → USER_PREFERENCE; regole di non-ambiguità |
| resolution-audit-spec.md | Formato append-only, hashing deterministico, correlazione Execution ID |
| resolution-test-cases.md | Golden path, conflitti, replay, serializzazione, certificazione determinismo |

## Vincoli

- Architettura deterministica; nessun LLM nel path decisionale.
- Implementabile, auditabile, replayabile; nessuna ambiguità semantica.
