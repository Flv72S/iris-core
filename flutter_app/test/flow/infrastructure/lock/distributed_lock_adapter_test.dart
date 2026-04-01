// K4 — Distributed lock adapter tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/lock/distributed_lock_adapter.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

void main() {
  late InMemoryDistributedLockAdapter adapter;

  setUp(() {
    adapter = InMemoryDistributedLockAdapter();
  });

  group('K4 — 1. Acquire & Release', () {
    test('acquireLock then releaseLock succeeds', () async {
      const key = 'lock-1';
      await adapter.acquireLock(key);
      await adapter.releaseLock(key);
      await adapter.acquireLock(key);
      await adapter.releaseLock(key);
    });
  });

  group('K4 — 2. Double Acquire', () {
    test('acquireLock same key twice throws LockException', () async {
      const key = 'lock-2';
      await adapter.acquireLock(key);
      expect(
        () => adapter.acquireLock(key),
        throwsA(isA<LockException>()),
      );
      await adapter.releaseLock(key);
    });
  });

  group('K4 — 3. Release Non Existing', () {
    test('releaseLock without acquire throws LockException', () async {
      const key = 'lock-3';
      expect(
        () => adapter.releaseLock(key),
        throwsA(isA<LockException>()),
      );
    });
  });

  group('K4 — 4. tryAcquireLock Success', () {
    test('tryAcquireLock when lock free returns true', () async {
      const key = 'lock-4';
      final got = await adapter.tryAcquireLock(key, Duration(seconds: 1));
      expect(got, isTrue);
      await adapter.releaseLock(key);
    });
  });

  group('K4 — 5. tryAcquireLock Timeout', () {
    test('tryAcquireLock when lock held and short timeout returns false', () async {
      const key = 'lock-5';
      await adapter.acquireLock(key);
      final got = await adapter.tryAcquireLock(key, Duration(milliseconds: 50));
      expect(got, isFalse);
      await adapter.releaseLock(key);
    });
  });

  group('K4 — 6. Deterministic Isolation', () {
    test('lock adapter dir has no import iris.core or persistence/replay/hash', () {
      final dir = Directory('lib/flow/infrastructure/adapter/lock');
      expect(dir.existsSync(), isTrue);
      final forbidden = [
        'package:iris_flutter_app/core',
        'package:iris_flutter_app/persistence',
        'package:iris_flutter_app/replay',
        'package:iris_flutter_app/hash',
      ];
      for (final entity in dir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not import $pattern',
          );
        }
      }
    });
  });

  // --- K4.1 extended tests ---

  group('K4.1 — 1. FIFO Fairness', () {
    test('three concurrent tryAcquireLock acquire in order 1→2→3 after release', () async {
      const key = 'fair';
      await adapter.acquireLock(key);

      final order = <int>[];
      final c1 = adapter.tryAcquireLock(key, Duration(seconds: 5)).then((v) {
        if (v) order.add(1);
        return v;
      });
      final c2 = adapter.tryAcquireLock(key, Duration(seconds: 5)).then((v) {
        if (v) order.add(2);
        return v;
      });
      final c3 = adapter.tryAcquireLock(key, Duration(seconds: 5)).then((v) {
        if (v) order.add(3);
        return v;
      });

      await Future.delayed(Duration(milliseconds: 20));
      await adapter.releaseLock(key);
      expect(await c1, isTrue);

      await adapter.releaseLock(key);
      expect(await c2, isTrue);

      await adapter.releaseLock(key);
      expect(await c3, isTrue);

      expect(order, [1, 2, 3]);
    });
  });

  group('K4.1 — 2. Ownership Safety', () {
    test('second release after first release throws LockException', () async {
      const key = 'owner';
      await adapter.acquireLock(key);
      await adapter.releaseLock(key);
      expect(
        () => adapter.releaseLock(key),
        throwsA(isA<LockException>()),
      );
    });
  });

  group('K4.1 — 3. Timeout Removal', () {
    test('timed-out waiter is removed from queue so next release clears key', () async {
      const key = 'timeout-removal';
      await adapter.acquireLock(key);
      final got = await adapter.tryAcquireLock(key, Duration(milliseconds: 50));
      expect(got, isFalse);
      await adapter.releaseLock(key);
      await adapter.acquireLock(key);
      await adapter.releaseLock(key);
    });
  });

  group('K4.1 — 4. Parallel TryAcquire Stress', () {
    test('10 concurrent tryAcquireLock acquire in order, no deadlock', () async {
      const key = 'stress';
      await adapter.acquireLock(key);

      const n = 10;
      final order = <int>[];
      final futures = List.generate(
        n,
        (i) => adapter.tryAcquireLock(key, Duration(seconds: 10)).then((v) {
          if (v) order.add(i + 1);
          return v;
        }),
      );

      for (var i = 0; i < n; i++) {
        await adapter.releaseLock(key);
        await Future.delayed(Duration(milliseconds: 5));
      }

      final results = await Future.wait(futures);
      expect(results.every((v) => v == true), isTrue, reason: 'all 10 must acquire');
      expect(order, List.generate(n, (i) => i + 1), reason: 'FIFO order 1..10');
    });
  });

  group('K4.1 — 5. Deterministic Isolation (no UUID/Random/isolate)', () {
    test('lock adapter has no UUID, Random, or isolate', () {
      final dir = Directory('lib/flow/infrastructure/adapter/lock');
      expect(dir.existsSync(), isTrue);
      final forbidden = ['Uuid', 'Random', 'isolate', 'Isolate'];
      for (final entity in dir.listSync()) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        for (final pattern in forbidden) {
          expect(
            content.contains(pattern),
            isFalse,
            reason: '${entity.path} must not reference $pattern',
          );
        }
      }
    });
  });
}
