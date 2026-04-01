// ODA-3 — Validate filtered node: global hash, index continuity, deterministic filter.

import 'package:iris_flutter_app/core/distributed/replication/filtering/filtered_ledger_view.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_definition.dart';

/// Result of filtered ledger validation.
class ScopeIntegrityResult {
  const ScopeIntegrityResult({
    required this.valid,
    this.globalHashMismatch = false,
    this.indexContinuityBroken = false,
    this.nonDeterministicFilter = false,
    this.unauthorizedEvent = false,
  });
  final bool valid;
  final bool globalHashMismatch;
  final bool indexContinuityBroken;
  final bool nonDeterministicFilter;
  final bool unauthorizedEvent;
}

class ScopeIntegrityValidator {
  ScopeIntegrityValidator._();

  /// Validates that [filteredView] is consistent: global hash reference, index order, deterministic.
  /// [expectedGlobalHeadHash] and [expectedScopeHash] from authority; [scopeDefinition] to re-apply filter if needed.
  static ScopeIntegrityResult validateFilteredLedger(
    FilteredLedgerView filteredView,
    String expectedGlobalHeadHash,
    String expectedScopeHash, {
    ScopeDefinition? scopeDefinition,
  }) {
    if (filteredView.globalHeadHash != expectedGlobalHeadHash) {
      return const ScopeIntegrityResult(valid: false, globalHashMismatch: true);
    }
    if (filteredView.scopeHash != expectedScopeHash) {
      return const ScopeIntegrityResult(valid: false, nonDeterministicFilter: true);
    }
    final events = filteredView.getFilteredEvents();
    int prevIndex = -1;
    for (final e in events) {
      if (e.index <= prevIndex) {
        return const ScopeIntegrityResult(valid: false, indexContinuityBroken: true);
      }
      prevIndex = e.index;
    }
    return const ScopeIntegrityResult(valid: true);
  }
}
