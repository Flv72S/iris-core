import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_guard.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_registry.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_result.dart';

/// Builds a contract with a fixed hash for testing.
DeterministicExecutionContract _contract(int hash, {List<int>? bytes}) {
  final b = bytes ?? [1, 2, 3, 4, 5];
  return DeterministicExecutionContract(
    operationId: 'op-$hash',
    resourceId: 'res-$hash',
    canonicalBytes: Uint8List.fromList(b),
    deterministicHash: hash,
  );
}

void main() {
  group('IdempotencyGuard', () {
    late IdempotencyRegistry registry;
    late IdempotencyGuard guard;

    setUp(() {
      registry = IdempotencyRegistry();
      guard = IdempotencyGuard(registry: registry);
    });

    group('1. First execution', () {
      test('new contract → alreadyExecuted == false', () {
        final contract = _contract(100);
        final result = guard.checkAndRegister(contract);
        expect(result.alreadyExecuted, false);
      });
    });

    group('2. Second execution', () {
      test('same contract again → alreadyExecuted == true', () {
        final contract = _contract(200);
        guard.checkAndRegister(contract);
        final result = guard.checkAndRegister(contract);
        expect(result.alreadyExecuted, true);
      });
    });

    group('3. Different contracts', () {
      test('different hashes → both allowed first time', () {
        final c1 = _contract(10);
        final c2 = _contract(20);
        final r1 = guard.checkAndRegister(c1);
        final r2 = guard.checkAndRegister(c2);
        expect(r1.alreadyExecuted, false);
        expect(r2.alreadyExecuted, false);
      });
      test('same hash different contract instance → second is alreadyExecuted', () {
        final c1 = _contract(42);
        final c2 = _contract(42);
        final r1 = guard.checkAndRegister(c1);
        final r2 = guard.checkAndRegister(c2);
        expect(r1.alreadyExecuted, false);
        expect(r2.alreadyExecuted, true);
      });
    });

    group('4. Registry isolation', () {
      test('clear() empties state → new contract is first execution again', () {
        final contract = _contract(99);
        guard.checkAndRegister(contract);
        registry.clear();
        final result = guard.checkAndRegister(contract);
        expect(result.alreadyExecuted, false);
      });
    });

    group('5. Determinism guard', () {
      test('idempotency module does not use DateTime, Random, UUID, storage, serializer, orchestrator', () async {
        final dir = Directory('lib/flow/application/idempotency');
        expect(await dir.exists(), true);
        await for (final e in dir.list()) {
          if (e is! File || !e.path.replaceAll(r'\', '/').endsWith('.dart')) continue;
          final content = await e.readAsString();
          expect(content.contains('DateTime'), false, reason: e.path);
          expect(content.contains('Random'), false, reason: e.path);
          expect(content.contains('Uuid'), false, reason: e.path);
          expect(content.contains('storage'), false, reason: e.path);
          expect(content.contains('CanonicalSerializer'), false, reason: e.path);
          expect(content.contains('orchestrator'), false, reason: e.path);
        }
      });
    });

    group('6. No mutation of contract', () {
      test('checkAndRegister does not modify contract', () {
        final bytes = Uint8List.fromList([1, 2, 3]);
        final contract = DeterministicExecutionContract(
          operationId: 'o',
          resourceId: 'r',
          canonicalBytes: bytes,
          deterministicHash: 123,
        );
        guard.checkAndRegister(contract);
        expect(contract.operationId, 'o');
        expect(contract.resourceId, 'r');
        expect(contract.deterministicHash, 123);
        expect(contract.canonicalBytes.length, 3);
      });
    });
  });

  group('IdempotencyRegistry', () {
    test('contains returns false when empty', () {
      final registry = IdempotencyRegistry();
      expect(registry.contains(1), false);
    });
    test('contains returns true after register', () {
      final registry = IdempotencyRegistry();
      registry.register(1);
      expect(registry.contains(1), true);
    });
    test('clear removes all', () {
      final registry = IdempotencyRegistry();
      registry.register(1);
      registry.register(2);
      registry.clear();
      expect(registry.contains(1), false);
      expect(registry.contains(2), false);
    });
  });
}
