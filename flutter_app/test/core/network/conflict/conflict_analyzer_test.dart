import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_analyzer.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_type.dart';

void main() {
  late ConflictAnalyzer analyzer;

  setUp(() {
    analyzer = ConflictAnalyzer();
  });

  group('ConflictAnalyzer', () {
    test('noConflict when local and remote equal', () {
      final ancestor = {'a': 1, 'b': 2};
      final state = {'a': 1, 'b': 2};
      final a = analyzer.analyze(
        ancestorState: ancestor,
        localState: state,
        remoteState: Map.from(state),
      );
      expect(a.conflictType, ConflictType.noConflict);
      expect(a.conflictingPaths, isEmpty);
      expect(a.mergeable, isTrue);
    });

    test('nonOverlappingChanges when local and remote change different keys', () {
      final ancestor = {'a': 1, 'b': 2, 'c': 3};
      final local = {'a': 10, 'b': 2, 'c': 3};
      final remote = {'a': 1, 'b': 2, 'c': 30};
      final analysis = analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(analysis.conflictType, ConflictType.nonOverlappingChanges);
      expect(analysis.conflictingPaths, isEmpty);
      expect(analysis.mergeable, isTrue);
    });

    test('fieldLevelConflict when same key changed differently', () {
      final ancestor = {'a': 1, 'b': 2};
      final local = {'a': 10, 'b': 2};
      final remote = {'a': 20, 'b': 2};
      final analysis = analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(analysis.conflictType, ConflictType.fieldLevelConflict);
      expect(analysis.conflictingPaths, contains('a'));
      expect(analysis.mergeable, isFalse);
    });

    test('objectDeletionConflict when one branch deletes key', () {
      final ancestor = {'a': 1, 'b': 2};
      final local = {'a': 1, 'b': 2};
      final remote = {'a': 1};
      final analysis = analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(analysis.conflictType, ConflictType.objectDeletionConflict);
      expect(analysis.mergeable, isFalse);
    });

    test('objectDeletionConflict when one branch sets key to null', () {
      final ancestor = {'a': 1};
      final local = {'a': null};
      final remote = {'a': 2};
      final analysis = analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(analysis.conflictType, ConflictType.objectDeletionConflict);
      expect(analysis.mergeable, isFalse);
    });

    test('nonOverlappingChanges when one branch adds key other does not have', () {
      final ancestor = {'a': 1};
      final local = {'a': 1, 'b': 10};
      final remote = {'a': 1};
      final analysis = analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(analysis.conflictType, ConflictType.nonOverlappingChanges);
      expect(analysis.mergeable, isTrue);
    });

    test('structuralConflict when both branches add same key with different values', () {
      final ancestor = <String, dynamic>{};
      final local = {'b': 10};
      final remote = {'b': 20};
      final analysis = analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(analysis.conflictType, ConflictType.structuralConflict);
      expect(analysis.mergeable, isFalse);
    });

    test('does not mutate input maps', () {
      final ancestor = {'a': 1};
      final local = {'a': 2};
      final remote = {'a': 3};
      final ancCopy = Map<String, dynamic>.from(ancestor);
      final localCopy = Map<String, dynamic>.from(local);
      final remoteCopy = Map<String, dynamic>.from(remote);
      analyzer.analyze(
        ancestorState: ancestor,
        localState: local,
        remoteState: remote,
      );
      expect(ancestor, ancCopy);
      expect(local, localCopy);
      expect(remote, remoteCopy);
    });
  });
}
