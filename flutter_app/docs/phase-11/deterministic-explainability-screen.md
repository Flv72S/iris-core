# Phase 11.3.2 — Deterministic Explainability Screen

## Prima UI certificata IRIS

Prima schermata visiva certificata: riceve solo `ExplainabilityViewModel` del contratto, mostra i dati senza trasformazioni né inferenze, rendering deterministico e golden-testabile.

## Determinismo visivo

- Gerarchia fissa: Scaffold → AppBar(title), Body → Padding → Column (Summary, Safety badge, State/Resolution, Outcome, Details scroll, Timestamp).
- Nessun if sul contenuto semantico, nessun fallback, nessuna animazione, nessun DateTime.now()/Random.
- Safety badge: mapping diretto stringa → colore design token (neutral/caution/block).

## Non-interpretazione

Solo lettura dei campi del ViewModel e layout statico. Scroll deterministico nell’area dettagli (altezza fissa). Timestamp mostrato senza formattazione runtime.

## Auditabilità

Schermata specchio del trace; separazione architetturale: nessuna dipendenza da bridge DTO, replay store, intent, core. Solo contratto explainability.

## File

lib/ui/explainability_screen/: deterministic_explainability_screen.dart, explainability_sections.dart (SafetyBadgeSection, StateResolutionSection, OutcomeSection, DetailsSection, TimestampFooter).
