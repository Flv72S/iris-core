// ODA-3 — Apply filter to full ledger stream. Global order preserved; no mutation.

import 'package:iris_flutter_app/core/distributed/replication/ledger_continuity_validator.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_definition.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/filtered_event_proof.dart';

/// Event with optional metadata for scope filtering. Hash-chain fields required.
class FilterableEvent {
  const FilterableEvent({
    required this.index,
    required this.eventHash,
    required this.previousHash,
    this.entityId,
    this.eventType,
    this.domain,
    this.permissionScope,
  });
  final int index;
  final String eventHash;
  final String previousHash;
  final String? entityId;
  final String? eventType;
  final String? domain;
  final String? permissionScope;
}

/// Result of filtering: included events, excluded indices, proof data.
class FilterResult {
  const FilterResult({
    required this.includedEvents,
    required this.excludedIndices,
    required this.inclusionProofData,
  });
  final List<FilterableEvent> includedEvents;
  final List<int> excludedIndices;
  final List<FilteredEventProof> inclusionProofData;
}

class DeterministicFilterEngine {
  DeterministicFilterEngine._();

  /// Applies [scope] to [events] in global order. Does not reorder or mutate. Identical on replay.
  static FilterResult filterEvents(List<FilterableEvent> events, ScopeDefinition scope) {
    if (!ScopeDefinition.validateScope(scope)) {
      throw ArgumentError('Invalid scope');
    }
    final included = <FilterableEvent>[];
    final excluded = <int>[];
    final proofs = <FilteredEventProof>[];
    final scopeHash = ScopeDefinition.getScopeHash(scope);

    for (final e in events) {
      final include = _matchesScope(e, scope);
      if (include) {
        included.add(e);
        proofs.add(FilteredEventProof.generateInclusionProof(
          globalIndex: e.index,
          eventHash: e.eventHash,
          scopeHash: scopeHash,
          membershipValidationProof: 'membership:${e.index}:${e.eventHash}',
        ));
      } else {
        excluded.add(e.index);
        proofs.add(FilteredEventProof.generateExclusionProof(
          index: e.index,
          scopeHash: scopeHash,
          eventHashAtIndex: e.eventHash,
        ));
      }
    }
    return FilterResult(
      includedEvents: included,
      excludedIndices: excluded,
      inclusionProofData: proofs,
    );
  }

  static bool _matchesScope(FilterableEvent e, ScopeDefinition scope) {
    switch (scope.scopeType) {
      case ScopeType.entityId:
        final ids = (scope.params['entityIds'] as List).cast<String>();
        return e.entityId != null && ids.contains(e.entityId);
      case ScopeType.eventType:
        final types = (scope.params['eventTypes'] as List).cast<String>();
        return e.eventType != null && types.contains(e.eventType);
      case ScopeType.domain:
        final domains = (scope.params['domains'] as List).cast<String>();
        return e.domain != null && domains.contains(e.domain);
      case ScopeType.permissionScope:
        final scopes = (scope.params['permissionScopes'] as List).cast<String>();
        return e.permissionScope != null && scopes.contains(e.permissionScope);
      case ScopeType.custom:
        // Custom: predicateId resolved to deterministic predicate; no closure in scope.
        // Default: include none for unknown predicate.
        return false;
    }
  }
}
