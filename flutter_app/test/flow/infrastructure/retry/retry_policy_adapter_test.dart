// K5 — Retry policy adapter tests. Deterministic: Duration.zero and computeDelay.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/retry/retry_policy_adapter.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

void main() {
  group('K5 — 1. Success Without Retry', () {
    test('sync operation returns immediately, executed once', () {
      var calls = 0;
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 3,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
      );
      final result = adapter.executeWithRetry<int>(() {
        calls++;
        return 99;
      });
      expect(result, 99);
      expect(calls, 1);
    });

    test('async operation returns immediately, executed once', () async {
      var calls = 0;
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 3,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
      );
      final result = await adapter.executeWithRetry<dynamic>(() async {
        calls++;
        return 42;
      });
      expect(result, 42);
      expect(calls, 1);
    });
  });

  group('K5 — 2. Success After Retries', () {
    test('fails twice then succeeds, correct attempt count and result', () async {
      var attempts = 0;
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 5,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
      );
      final result = await adapter.executeWithRetry<dynamic>(() async {
        attempts++;
        if (attempts < 3) throw Exception('fail');
        return 'ok';
      });
      expect(result, 'ok');
      expect(attempts, 3);
    });
  });

  group('K5 — 3. Max Attempts Exceeded', () {
    test('RetryException thrown, cause present, attempts = maxAttempts', () async {
      var attempts = 0;
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 3,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
      );
      final future = adapter.executeWithRetry<dynamic>(() async {
        attempts++;
        throw Exception('always fail');
      });
      await expectLater(future, throwsA(isA<RetryException>()));
      expect(attempts, 3);
    });

    test('RetryException has cause', () async {
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 2,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
      );
      try {
        await adapter.executeWithRetry<dynamic>(() async {
          throw Exception('original');
        });
      } on RetryException catch (e) {
        expect(e.cause, isNotNull);
        expect(e.cause.toString(), contains('original'));
        return;
      }
      fail('RetryException expected');
    });
  });

  group('K5 — 4. retryOn Predicate', () {
    test('non-retryable exception: no retry, original rethrown', () async {
      var attempts = 0;
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 5,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
        retryOn: (e) => e.toString().contains('retry'),
      );
      final future = adapter.executeWithRetry<dynamic>(() async {
        attempts++;
        throw Exception('fatal');
      });
      await expectLater(future, throwsA(isA<Exception>()));
      expect(attempts, 1);
    });

    test('retryable exception: retries until success', () async {
      var attempts = 0;
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 5,
        initialDelay: Duration.zero,
        backoffFactor: 2.0,
        retryOn: (e) => e.toString().contains('retry'),
      );
      final result = await adapter.executeWithRetry<dynamic>(() async {
        attempts++;
        if (attempts < 3) throw Exception('retry me');
        return 7;
      });
      expect(result, 7);
      expect(attempts, 3);
    });
  });

  group('K5 — 5. Backoff Growth (computeDelay)', () {
    test('delay grows by backoffFactor and respects maxDelay', () {
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 5,
        initialDelay: Duration(milliseconds: 100),
        backoffFactor: 2.0,
        maxDelay: Duration(milliseconds: 350),
      );
      expect(adapter.computeDelay(1), Duration(milliseconds: 100));
      expect(adapter.computeDelay(2), Duration(milliseconds: 200));
      expect(adapter.computeDelay(3), Duration(milliseconds: 350)); // 100*4=400 capped to 350
    });

    test('no maxDelay: delay grows unbounded by factor', () {
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 5,
        initialDelay: Duration(milliseconds: 10),
        backoffFactor: 3.0,
      );
      expect(adapter.computeDelay(1), Duration(milliseconds: 10));
      expect(adapter.computeDelay(2), Duration(milliseconds: 30));
      expect(adapter.computeDelay(3), Duration(milliseconds: 90));
    });

    test('computeDelay(0) returns zero', () {
      final adapter = ExponentialBackoffRetryPolicyAdapter(
        maxAttempts: 1,
        initialDelay: Duration(milliseconds: 100),
        backoffFactor: 2.0,
      );
      expect(adapter.computeDelay(0), Duration.zero);
    });
  });

  group('K5 — 6. Deterministic Isolation', () {
    test('retry adapter dir has no iris.core, storage, lock, replay, hash', () {
      final dir = Directory('lib/flow/infrastructure/adapter/retry');
      expect(dir.existsSync(), isTrue);
      final forbidden = [
        'package:iris_flutter_app/core',
        'package:iris_flutter_app/flow/infrastructure/adapter/lock',
        'package:iris_flutter_app/flow/infrastructure/port/cloud_storage',
        'persistence',
        'replay',
        'hash',
      ];
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
