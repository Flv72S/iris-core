import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/fork/fork_analysis.dart';
import 'package:iris_flutter_app/core/network/fork/fork_branch.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_backend.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_engine.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_policy.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_result.dart';

ForkBranch localBranch({int start = 2, int length = 2}) => ForkBranch(
      branchId: 'local',
      startingHeight: start,
      eventHashes: List.generate(length, (i) => 'a${start + i}'),
      finalSnapshotHash: 'localTip',
    );

ForkBranch remoteBranch({int start = 2, int length = 3}) => ForkBranch(
      branchId: 'remote',
      startingHeight: start,
      eventHashes: List.generate(length, (i) => 'b${start + i}'),
      finalSnapshotHash: 'remoteTip',
    );

ForkAnalysis analysis({int ancestor = 2}) => ForkAnalysis(
      commonAncestorHeight: ancestor,
      localBranch: localBranch(start: ancestor),
      remoteBranch: remoteBranch(start: ancestor),
    );

/// Mock backend: configurable return values for tests.
class MockForkBackend implements ForkResolutionBackend {
  MockForkBackend({
    this.validateRemoteResult = true,
    this.verifyLocalResult = true,
  });

  bool validateRemoteResult;
  bool verifyLocalResult;

  @override
  bool validateAndApplyRemoteBranch({
    required int commonAncestorHeight,
    required ForkBranch remoteBranch,
  }) =>
      validateRemoteResult;

  @override
  bool verifyLocalChain() => verifyLocalResult;
}

void main() {
  late ForkResolutionEngine engine;

  setUp(() {
    engine = ForkResolutionEngine();
  });

  group('ForkResolutionEngine', () {
    test('Manual strategy → deferred', () {
      final backend = MockForkBackend();
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy.defaultPolicy,
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.deferred);
      expect(result.message, contains('manual'));
      expect(result.appliedBranchId, isNull);
    });

    test('Reject strategy → rejected', () {
      final backend = MockForkBackend();
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.reject),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.rejected);
      expect(result.message, contains('rejected'));
    });

    test('Prefer remote → valid replay', () {
      final backend = MockForkBackend(validateRemoteResult: true);
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferRemote),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.resolvedRemote);
      expect(result.appliedBranchId, 'remote');
    });

    test('Prefer remote → invalid replay', () {
      final backend = MockForkBackend(validateRemoteResult: false);
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferRemote),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.rejected);
      expect(result.message, anyOf(contains('validation failed'), contains('unchanged')));
    });

    test('Prefer local', () {
      final backend = MockForkBackend(verifyLocalResult: true);
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferLocal),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.resolvedLocal);
      expect(result.appliedBranchId, 'local');
    });

    test('Prefer local → integrity check fails', () {
      final backend = MockForkBackend(verifyLocalResult: false);
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferLocal),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.rejected);
      expect(result.message, contains('integrity'));
    });

    test('Prefer remote with requireFullReplayValidation false → rejected', () {
      final backend = MockForkBackend(validateRemoteResult: true);
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(
          strategy: ForkResolutionStrategy.preferRemote,
          requireFullReplayValidation: false,
        ),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.rejected);
      expect(result.message, contains('replay validation'));
    });

    test('Result is explicit and auditable', () {
      final backend = MockForkBackend();
      final result = engine.resolve(
        analysis: analysis(),
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.reject),
        backend: backend,
      );
      expect(result.status, isNotNull);
      expect(result.message, isNotEmpty);
      expect(result.toString(), contains('rejected'));
    });
  });

  group('Multiple fork depths', () {
    test('Fork at depth 1', () {
      final a = analysis(ancestor: 1);
      expect(a.commonAncestorHeight, 1);
      expect(a.localBranch.startingHeight, 1);
      expect(a.remoteBranch.startingHeight, 1);
      final backend = MockForkBackend(validateRemoteResult: true);
      final result = engine.resolve(
        analysis: a,
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferRemote),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.resolvedRemote);
    });

    test('Fork at depth 5', () {
      final a = ForkAnalysis(
        commonAncestorHeight: 5,
        localBranch: localBranch(start: 5, length: 3),
        remoteBranch: remoteBranch(start: 5, length: 4),
      );
      final backend = MockForkBackend(validateRemoteResult: true);
      final result = engine.resolve(
        analysis: a,
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferRemote),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.resolvedRemote);
    });
  });

  group('Edge case: fork at genesis', () {
    test('Ancestor 0', () {
      final a = ForkAnalysis(
        commonAncestorHeight: 0,
        localBranch: ForkBranch(
          branchId: 'local',
          startingHeight: 0,
          eventHashes: ['a0', 'a1'],
          finalSnapshotHash: 'l',
        ),
        remoteBranch: ForkBranch(
          branchId: 'remote',
          startingHeight: 0,
          eventHashes: ['b0', 'b1', 'b2'],
          finalSnapshotHash: 'r',
        ),
      );
      final backend = MockForkBackend(validateRemoteResult: false);
      final result = engine.resolve(
        analysis: a,
        policy: ForkResolutionPolicy(strategy: ForkResolutionStrategy.preferRemote),
        backend: backend,
      );
      expect(result.status, ForkResolutionStatus.rejected);
    });
  });
}
