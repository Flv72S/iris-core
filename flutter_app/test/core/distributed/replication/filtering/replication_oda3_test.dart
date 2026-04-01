// ODA-3 — Partial & filtered replication tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_definition.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_validator.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/replication_scope.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/deterministic_filter_engine.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/filtered_event_proof.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/filtered_ledger_view.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/scoped_delta_calculator.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/scope_integrity_validator.dart';
import 'package:iris_flutter_app/core/distributed/replication/filtering/filtered_snapshot.dart';
import 'package:iris_flutter_app/core/distributed/replication/fork_boundary_detector.dart';

void main() {
  group('ODA-3 Deterministic scope hashing', () {
    test('same scope definition produces same scope hash', () {
      const scope = ScopeDefinition(
        scopeType: ScopeType.entityId,
        params: {'entityIds': ['e1', 'e2']},
      );
      expect(ScopeDefinition.getScopeHash(scope), ScopeDefinition.getScopeHash(scope));
    });
    test('different params produce different hash', () {
      const a = ScopeDefinition(scopeType: ScopeType.entityId, params: {'entityIds': ['e1']});
      const b = ScopeDefinition(scopeType: ScopeType.entityId, params: {'entityIds': ['e2']});
      expect(ScopeDefinition.getScopeHash(a), isNot(ScopeDefinition.getScopeHash(b)));
    });
  });

  group('ODA-3 Scope binding signature validation', () {
    test('verifyScopeBinding returns true when signature check passes', () {
      const def = ScopeDefinition(scopeType: ScopeType.eventType, params: {'eventTypes': ['T1']});
      final scope = ReplicationScope.bindScopeToNode(
        nodeId: 'n1',
        scopeDefinition: def,
        bindingSignature: 'sig123',
      );
      final ok = ReplicationScope.verifyScopeBinding(
        scope,
        (nodeId, scopeHash, sig) => sig == 'sig123',
      );
      expect(ok, isTrue);
    });
    test('verifyScopeBinding returns false when signature check fails', () {
      const def = ScopeDefinition(scopeType: ScopeType.eventType, params: {'eventTypes': ['T1']});
      final scope = ReplicationScope.bindScopeToNode(
        nodeId: 'n1',
        scopeDefinition: def,
        bindingSignature: 'sig123',
      );
      final ok = ReplicationScope.verifyScopeBinding(
        scope,
        (nodeId, scopeHash, sig) => sig == 'wrong',
      );
      expect(ok, isFalse);
    });
  });

  group('ODA-3 Filtered replication from full node', () {
    test('filterEvents returns only events matching scope', () {
      const scope = ScopeDefinition(
        scopeType: ScopeType.entityId,
        params: {'entityIds': ['e1']},
      );
      final events = [
        const FilterableEvent(index: 0, eventHash: 'h0', previousHash: '', entityId: 'e1'),
        const FilterableEvent(index: 1, eventHash: 'h1', previousHash: 'h0', entityId: 'e2'),
        const FilterableEvent(index: 2, eventHash: 'h2', previousHash: 'h1', entityId: 'e1'),
      ];
      final result = DeterministicFilterEngine.filterEvents(events, scope);
      expect(result.includedEvents.length, 2);
      expect(result.includedEvents[0].index, 0);
      expect(result.includedEvents[1].index, 2);
      expect(result.excludedIndices, [1]);
    });
  });

  group('ODA-3 Filtered delta correctness', () {
    test('calculateScopedDelta returns global range and needSync', () {
      final view = FilteredLedgerView(
        filteredEvents: [
          const FilterableEvent(index: 0, eventHash: 'h0', previousHash: '', entityId: 'e1'),
        ],
        globalHeadHash: 'h0',
        globalHeight: 1,
        scopeHash: 'sh1',
      );
      final local = LocalScopeState(globalHeight: 1, globalHeadHash: 'h0', filteredView: view);
      const peer = PeerSnapshotForScope(globalLedgerHeadHash: 'h2', globalHeight: 3);
      final result = ScopedDeltaCalculator.calculateScopedDelta(local, peer, 1);
      expect(result.needSync, isTrue);
      expect(result.globalRange.startIndex, 1);
      expect(result.globalRange.endIndex, 2);
    });
  });

  group('ODA-3 Inclusion proof validation', () {
    test('verifyProof returns true for valid inclusion proof', () {
      final proof = FilteredEventProof.generateInclusionProof(
        globalIndex: 0,
        eventHash: 'h0',
        scopeHash: 'sh',
        membershipValidationProof: 'm',
      );
      expect(FilteredEventProof.verifyProof(proof, 'sh'), isTrue);
    });
    test('verifyProof returns false for wrong scope hash', () {
      final proof = FilteredEventProof.generateInclusionProof(
        globalIndex: 0,
        eventHash: 'h0',
        scopeHash: 'sh',
        membershipValidationProof: 'm',
      );
      expect(FilteredEventProof.verifyProof(proof, 'other'), isFalse);
    });
  });

  group('ODA-3 Exclusion proof validation', () {
    test('verifyProof returns true for valid exclusion proof', () {
      final proof = FilteredEventProof.generateExclusionProof(
        index: 1,
        scopeHash: 'sh',
        eventHashAtIndex: 'h1',
      );
      expect(FilteredEventProof.verifyProof(proof, 'sh'), isTrue);
    });
  });

  group('ODA-3 Replay producing identical filtered view', () {
    test('filterEvents produces same result on replay', () {
      const scope = ScopeDefinition(
        scopeType: ScopeType.eventType,
        params: {'eventTypes': ['A']},
      );
      final events = [
        const FilterableEvent(index: 0, eventHash: 'h0', previousHash: '', eventType: 'A'),
        const FilterableEvent(index: 1, eventHash: 'h1', previousHash: 'h0', eventType: 'B'),
      ];
      final r1 = DeterministicFilterEngine.filterEvents(events, scope);
      final r2 = DeterministicFilterEngine.filterEvents(events, scope);
      expect(r1.includedEvents.length, r2.includedEvents.length);
      expect(r1.excludedIndices, r2.excludedIndices);
      for (var i = 0; i < r1.includedEvents.length; i++) {
        expect(r1.includedEvents[i].index, r2.includedEvents[i].index);
        expect(r1.includedEvents[i].eventHash, r2.includedEvents[i].eventHash);
      }
    });
  });

  group('ODA-3 Fork detection in filtered node', () {
    test('filtered node can detect divergence via global head', () {
      // Filtered view still has global head; fork detector uses global hashes.
      final local = _StubLedger(height: 2, headHash: 'h2', hashes: ['h0', 'h1', 'h2']);
      final report = ForkBoundaryDetector.detectFork(
        local,
        'other_head',
        (i) => i == 2 ? 'other_head' : (local.getHashAt(i) ?? ''),
        3,
      );
      expect(report.forkDetected, isTrue);
    });
  });

  group('ODA-3 Scope mismatch rejection', () {
    test('ScopeIntegrityValidator fails when scope hash differs', () {
      final view = FilteredLedgerView(
        filteredEvents: [],
        globalHeadHash: 'gh',
        globalHeight: 0,
        scopeHash: 'scopeA',
      );
      final result = ScopeIntegrityValidator.validateFilteredLedger(
        view,
        'gh',
        'scopeB',
      );
      expect(result.valid, isFalse);
      expect(result.nonDeterministicFilter, isTrue);
    });
  });

  group('ODA-3 Global index continuity enforcement', () {
    test('ScopeIntegrityValidator fails when indices not strictly increasing', () {
      final view = FilteredLedgerView(
        filteredEvents: [
          const FilterableEvent(index: 0, eventHash: 'h0', previousHash: ''),
          const FilterableEvent(index: 0, eventHash: 'h0b', previousHash: ''),
        ],
        globalHeadHash: 'gh',
        globalHeight: 2,
        scopeHash: 'sh',
      );
      final result = ScopeIntegrityValidator.validateFilteredLedger(
        view,
        'gh',
        'sh',
      );
      expect(result.valid, isFalse);
      expect(result.indexContinuityBroken, isTrue);
    });
  });

  group('ODA-3 Snapshot comparison with differing scopes', () {
    test('compare returns scopeMismatch when scope hashes differ', () {
      final local = FilteredSnapshot.createFilteredSnapshot(
        globalLedgerHeadHash: 'g',
        scopeHash: 's1',
        filteredHeadHash: 'f1',
        membershipHash: 'm',
        clusterHash: 'c',
      );
      final peer = FilteredSnapshot.createFilteredSnapshot(
        globalLedgerHeadHash: 'g',
        scopeHash: 's2',
        filteredHeadHash: 'f2',
        membershipHash: 'm',
        clusterHash: 'c',
      );
      expect(
        FilteredSnapshotComparator.compare(local, peer),
        FilteredSnapshotCompareResult.scopeMismatch,
      );
    });
    test('compare returns compatible when same scope and heads', () {
      final local = FilteredSnapshot.createFilteredSnapshot(
        globalLedgerHeadHash: 'g',
        scopeHash: 's',
        filteredHeadHash: 'f',
        membershipHash: 'm',
        clusterHash: 'c',
      );
      final peer = FilteredSnapshot.createFilteredSnapshot(
        globalLedgerHeadHash: 'g',
        scopeHash: 's',
        filteredHeadHash: 'f',
        membershipHash: 'm',
        clusterHash: 'c',
      );
      expect(
        FilteredSnapshotComparator.compare(local, peer),
        FilteredSnapshotCompareResult.compatible,
      );
    });
  });

  group('ODA-3 Crash recovery of filtered node', () {
    test('replay of same event stream rebuilds identical filtered view', () {
      const scope = ScopeDefinition(
        scopeType: ScopeType.domain,
        params: {'domains': ['d1']},
      );
      final events = [
        const FilterableEvent(index: 0, eventHash: 'h0', previousHash: '', domain: 'd1'),
        const FilterableEvent(index: 1, eventHash: 'h1', previousHash: 'h0', domain: 'd2'),
        const FilterableEvent(index: 2, eventHash: 'h2', previousHash: 'h1', domain: 'd1'),
      ];
      final r1 = DeterministicFilterEngine.filterEvents(events, scope);
      final view1 = FilteredLedgerView(
        filteredEvents: r1.includedEvents,
        globalHeadHash: 'h2',
        globalHeight: 3,
        scopeHash: ScopeDefinition.getScopeHash(scope),
      );
      final r2 = DeterministicFilterEngine.filterEvents(events, scope);
      final view2 = FilteredLedgerView(
        filteredEvents: r2.includedEvents,
        globalHeadHash: 'h2',
        globalHeight: 3,
        scopeHash: ScopeDefinition.getScopeHash(scope),
      );
      expect(view1.getFilteredHeadHash(), view2.getFilteredHeadHash());
    });
  });

  group('ODA-3 Cluster hash stability with mixed node types', () {
    test('FilteredSnapshot preserves cluster hash for comparison', () {
      final fullNodeSnapshot = FilteredSnapshot.createFilteredSnapshot(
        globalLedgerHeadHash: 'g',
        scopeHash: 'full',
        filteredHeadHash: 'g',
        membershipHash: 'm',
        clusterHash: 'cluster1',
      );
      final scopedNodeSnapshot = FilteredSnapshot.createFilteredSnapshot(
        globalLedgerHeadHash: 'g',
        scopeHash: 'scope1',
        filteredHeadHash: 'f1',
        membershipHash: 'm',
        clusterHash: 'cluster1',
      );
      expect(fullNodeSnapshot.clusterHash, scopedNodeSnapshot.clusterHash);
      expect(FilteredSnapshot.validateFilteredSnapshot(fullNodeSnapshot), isTrue);
      expect(FilteredSnapshot.validateFilteredSnapshot(scopedNodeSnapshot), isTrue);
    });
  });
}

class _StubLedger implements LedgerHashView {
  _StubLedger({required this.height, required this.headHash, required this.hashes});
  @override
  final int height;
  @override
  final String headHash;
  final List<String> hashes;

  @override
  String? getHashAt(int index) {
    if (index < 0 || index >= hashes.length) return null;
    return hashes[index];
  }
}
