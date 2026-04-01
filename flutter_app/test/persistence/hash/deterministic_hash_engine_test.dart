// J3 — Tests for Deterministic Hash Engine.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/sha256_deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_failure_event.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/model/persisted_guard_report.dart';
import 'package:iris_flutter_app/persistence/model/persisted_observability_event.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';

void main() {
  const engine = Sha256DeterministicHashEngine();

  group('Map order determinism', () {
    test('two maps with different key order produce identical hash', () {
      final map1 = <String, Object>{'a': 1, 'b': 2, 'c': 3};
      final map2 = <String, Object>{'c': 3, 'a': 1, 'b': 2};
      expect(engine.hash(map1), engine.hash(map2));
    });
  });

  group('Nested structure determinism', () {
    test('nested map produces same hash on multiple runs', () {
      final input = <String, Object>{
        'b': 2,
        'a': <String, Object>{
          'x': 1,
          'y': 3,
        },
      };
      final h1 = engine.hash(input);
      final h2 = engine.hash(input);
      expect(h1, h2);
    });
  });

  group('List stability', () {
    test('same list order produces identical hash', () {
      final list = <Object>['a', 'b', 'c'];
      expect(engine.hashList(list), engine.hashList(list));
    });
    test('different list order produces different hash', () {
      final list1 = <Object>['a', 'b', 'c'];
      final list2 = <Object>['c', 'b', 'a'];
      expect(engine.hashList(list1), isNot(engine.hashList(list2)));
    });
  });

  group('Null handling', () {
    test('list with null produces deterministic hash', () {
      final input = <Object?>['a', null, 'b'];
      final h1 = engine.hashList(input);
      final h2 = engine.hashList(input);
      expect(h1, h2);
    });
    test('map with null value produces deterministic hash', () {
      final input = <String, Object?>{'k': 'v', 'n': null};
      final h1 = engine.hash(input);
      final h2 = engine.hash(input);
      expect(h1, h2);
    });
  });

  group('Cross instance stability', () {
    test('two engine instances produce same hash for same input', () {
      const e1 = Sha256DeterministicHashEngine();
      const e2 = Sha256DeterministicHashEngine();
      final input = <String, Object>{'x': 1, 'y': 2};
      expect(e1.hash(input), e2.hash(input));
    });
  });

  group('HashUtils', () {
    test('hashSnapshot', () {
      final snapshot = PersistedGovernanceSnapshot(
        executionId: 'e1',
        schemaVersion: 'J2.v1',
        governanceHash: 'gh',
        lifecycleHash: 'lh',
        governanceData: {},
        lifecycleData: {},
        logicalTimestamp: 0,
      );
      expect(HashUtils.hashSnapshot(snapshot, engine), isNotEmpty);
    });
    test('hashResult', () {
      final result = PersistedExecutionResult(
        executionId: 'e2',
        schemaVersion: 'J2.v1',
        resultHash: 'rh',
        resultData: {},
        logicalTimestamp: 0,
      );
      expect(HashUtils.hashResult(result, engine), isNotEmpty);
    });
    test('hashEvent', () {
      final event = PersistedObservabilityEvent(
        executionId: 'e3',
        eventId: 'ev1',
        eventType: 'started',
        payload: {},
        logicalTimestamp: 0,
        eventHash: 'eh',
        schemaVersion: 'J2.v1',
      );
      expect(HashUtils.hashEvent(event, engine), isNotEmpty);
    });
    test('hashFailure', () {
      final failure = PersistedFailureEvent(
        executionId: 'e4',
        failureCode: 'ERR',
        failureType: 'network',
        severity: 'error',
        details: {},
        logicalTimestamp: 0,
        failureHash: 'fh',
        schemaVersion: 'J2.v1',
      );
      expect(HashUtils.hashFailure(failure, engine), isNotEmpty);
    });
    test('hashGuard', () {
      final report = PersistedGuardReport(
        executionId: 'e5',
        schemaVersion: 'J2.v1',
        compliant: true,
        violations: const [],
        guardHash: 'gh',
        logicalTimestamp: 0,
      );
      expect(HashUtils.hashGuard(report, engine), isNotEmpty);
    });
  });

  group('Output format', () {
    test('hash is hex lowercase', () {
      final h = engine.hashString('test');
      expect(h, matches(RegExp(r'^[a-f0-9]+$')));
    });
  });
}
