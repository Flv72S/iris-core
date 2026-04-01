import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_resolution_result.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_type.dart';
import 'package:iris_flutter_app/core/network/conflict/merge_engine.dart';
import 'package:iris_flutter_app/core/network/conflict/merge_strategy.dart';

void main() {
  late MergeEngine engine;

  setUp(() {
    engine = MergeEngine();
  });

  group('MergeEngine', () {
    test('noConflict returns merged with local state', () {
      final ancestor = {'a': 1, 'b': 2};
      final local = {'a': 1, 'b': 2};
      final remote = {'a': 1, 'b': 2};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.merged);
      expect(result.mergedStateMap, isNotNull);
      expect(result.mergedStateMap, equals(local));
    });

    test('nonOverlappingChanges merges and combines changes', () {
      final ancestor = {'a': 1, 'b': 2, 'c': 3};
      final local = {'a': 10, 'b': 2, 'c': 3};
      final remote = {'a': 1, 'b': 2, 'c': 30};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.merged);
      expect(result.mergedStateMap!['a'], 10);
      expect(result.mergedStateMap!['c'], 30);
      expect(result.mergedStateMap!['b'], 2);
    });

    test('field conflict with fieldPriorityLocal returns merged local', () {
      final ancestor = {'a': 1};
      final local = {'a': 10};
      final remote = {'a': 20};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy(type: MergeStrategyType.fieldPriorityLocal),
      );
      expect(result.status, ConflictResolutionStatus.merged);
      expect(result.mergedStateMap!['a'], 10);
    });

    test('field conflict with fieldPriorityRemote returns merged remote', () {
      final ancestor = {'a': 1};
      final local = {'a': 10};
      final remote = {'a': 20};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy(type: MergeStrategyType.fieldPriorityRemote),
      );
      expect(result.status, ConflictResolutionStatus.merged);
      expect(result.mergedStateMap!['a'], 20);
    });

    test('field conflict with strictReject returns rejected', () {
      final ancestor = {'a': 1};
      final local = {'a': 10};
      final remote = {'a': 20};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy(type: MergeStrategyType.strictReject),
      );
      expect(result.status, ConflictResolutionStatus.rejected);
      expect(result.mergedStateMap, isNull);
    });

    test('field conflict with default strategy returns rejected', () {
      final ancestor = {'a': 1};
      final local = {'a': 10};
      final remote = {'a': 20};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.rejected);
      expect(result.mergedStateMap, isNull);
    });

    test('structural conflict with allowStructuralMerge false returns rejected', () {
      final ancestor = {'a': 1};
      final local = {'a': null};
      final remote = {'a': 2};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.rejected);
      expect(result.mergedStateMap, isNull);
    });

    test('structural conflict with allowStructuralMerge true returns deferred', () {
      final ancestor = <String, dynamic>{};
      final local = {'b': 10};
      final remote = {'b': 20};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy(allowStructuralMerge: true),
      );
      expect(result.status, ConflictResolutionStatus.deferred);
      expect(result.mergedStateMap, isNull);
    });

    test('objectDeletionConflict returns rejected', () {
      final ancestor = {'a': 1, 'b': 2};
      final local = {'a': 1, 'b': 2};
      final remote = {'a': 1};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.rejected);
      expect(result.mergedStateMap, isNull);
    });

    test('deterministic: same input produces same merged output', () {
      final ancestor = {'a': 1, 'b': 2, 'c': 3};
      final local = {'a': 10, 'b': 2, 'c': 3};
      final remote = {'a': 1, 'b': 2, 'c': 30};
      final r1 = engine.merge(
        ancestorState: Map.from(ancestor),
        localState: Map.from(local),
        remoteState: Map.from(remote),
        strategy: MergeStrategy.defaultStrategy,
      );
      final r2 = engine.merge(
        ancestorState: Map.from(ancestor),
        localState: Map.from(local),
        remoteState: Map.from(remote),
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(r1.status, r2.status);
      expect(r1.mergedStateMap, equals(r2.mergedStateMap));
    });

    test('no mutation of inputs on merge', () {
      final ancestor = {'a': 1};
      final local = {'a': 10};
      final remote = {'a': 20};
      final ancCopy = Map<String, dynamic>.from(ancestor);
      final localCopy = Map<String, dynamic>.from(local);
      final remoteCopy = Map<String, dynamic>.from(remote);
      engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy(type: MergeStrategyType.strictReject),
      );
      expect(ancestor, ancCopy);
      expect(local, localCopy);
      expect(remote, remoteCopy);
    });

    test('no mutation of inputs on successful merge', () {
      final ancestor = {'a': 1, 'b': 2};
      final local = {'a': 10, 'b': 2};
      final remote = {'a': 1, 'b': 2, 'c': 30};
      final localCopy = Map<String, dynamic>.from(local);
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.merged);
      expect(local, localCopy);
    });

    test('fork-style merge: ancestor and two branches merge non-overlapping', () {
      final ancestor = {'v': 0, 'x': 1, 'y': 2};
      final local = {'v': 0, 'x': 10, 'y': 2};
      final remote = {'v': 0, 'x': 1, 'y': 20};
      final result = engine.merge(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
        strategy: MergeStrategy.defaultStrategy,
      );
      expect(result.status, ConflictResolutionStatus.merged);
      expect(result.mergedStateMap!['x'], 10);
      expect(result.mergedStateMap!['y'], 20);
      expect(result.mergedStateMap!['v'], 0);
    });
  });
}
