// K5 — Exponential backoff retry policy adapter. Deterministic, no jitter.

import 'dart:async';

import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/retry_policy_port.dart';

/// Adapter that implements [RetryPolicyPort] with exponential backoff.
/// No jitter, no Random; delay = initialDelay * (backoffFactor ^ (attempt-1)), capped by [maxDelay].
class ExponentialBackoffRetryPolicyAdapter implements RetryPolicyPort {
  ExponentialBackoffRetryPolicyAdapter({
    required this.maxAttempts,
    required this.initialDelay,
    required this.backoffFactor,
    this.maxDelay,
    this.retryOn,
  });

  final int maxAttempts;
  final Duration initialDelay;
  final double backoffFactor;
  final Duration? maxDelay;
  final bool Function(Exception e)? retryOn;

  /// Pure delay for attempt (1-based). delay_n = initialDelay * (backoffFactor ^ (attempt-1)).
  /// Capped by [maxDelay] if set. Exposed for deterministic testing.
  Duration computeDelay(int attempt) {
    if (attempt < 1) return Duration.zero;
    final raw = initialDelay.inMicroseconds * _pow(backoffFactor, attempt - 1);
    final capped = maxDelay != null && raw > maxDelay!.inMicroseconds
        ? maxDelay!.inMicroseconds
        : raw;
    return Duration(microseconds: capped.toInt());
  }

  static double _pow(double base, int exp) {
    if (exp <= 0) return 1.0;
    var r = 1.0;
    for (var i = 0; i < exp; i++) r *= base;
    return r;
  }

  @override
  T executeWithRetry<T>(T Function() operation) {
    final result = operation();
    if (result is Future) {
      return _runWithRetry(result as Future<Object?>, operation) as T;
    }
    return result;
  }

  Future<Object?> _runWithRetry(
    Future<Object?> firstAttempt,
    Object? Function() operation,
  ) async {
    Object? lastError;
    try {
      return await firstAttempt;
    } catch (e) {
      lastError = e;
    }
    for (var attempt = 2; attempt <= maxAttempts; attempt++) {
      if (retryOn != null && lastError is Exception && !retryOn!(lastError)) {
        throw lastError!;
      }
      if (lastError != null) {
        final delay = computeDelay(attempt - 1);
        await Future.delayed(delay);
      }
      lastError = null;
      try {
        final r = operation();
        if (r is Future) return await r;
        return r;
      } catch (e) {
        lastError = e;
        if (attempt >= maxAttempts) {
          throw RetryException('Max attempts exceeded', lastError);
        }
      }
    }
    throw RetryException('Max attempts exceeded', lastError);
  }
}
