/// O9 — Central observability orchestrator. Non-blocking; never breaks sync.

import 'package:iris_flutter_app/core/network/observability/sync_audit_store.dart';
import 'package:iris_flutter_app/core/network/observability/sync_event.dart';
import 'package:iris_flutter_app/core/network/observability/sync_metrics_collector.dart';

/// Subscribes to sync lifecycle; forwards to audit store and metrics.
/// If audit fails, core logic continues; error is not rethrown.
class SyncObserver {
  SyncObserver({
    required SyncAuditStore store,
    required SyncMetricsCollector metrics,
  })  : _store = store,
        _metrics = metrics;

  final SyncAuditStore _store;
  final SyncMetricsCollector _metrics;

  /// Record [event]. Appends to store and updates metrics. Swallows store errors.
  void record(SyncEvent event) {
    try {
      _store.append(event);
      _incrementMetricsForEvent(event);
    } catch (_) {
      // Observability must never break sync; do not rethrow.
    }
  }

  void _incrementMetricsForEvent(SyncEvent event) {
    switch (event.type) {
      case SyncEventType.syncStarted:
        _metrics.increment('totalSyncAttempts');
        break;
      case SyncEventType.syncCompleted:
        _metrics.increment('syncCompleted');
        break;
      case SyncEventType.syncFailed:
        _metrics.increment('syncFailed');
        break;
      case SyncEventType.divergenceDetected:
        _metrics.increment('divergenceDetected');
        break;
      case SyncEventType.reconciliationAttempted:
        _metrics.increment('reconciliationAttempted');
        break;
      case SyncEventType.reconciliationResult:
        _metrics.increment('reconciliationResult');
        _maybeIncrementReconciliationOutcome(event);
        break;
      case SyncEventType.forkAnalyzed:
        _metrics.increment('forksDetected');
        break;
      case SyncEventType.forkResolutionAttempted:
        _metrics.increment('forkResolutionAttempted');
        break;
      case SyncEventType.forkResolutionResult:
        _metrics.increment('forkResolutionResult');
        _maybeIncrementForkResolved(event);
        break;
      case SyncEventType.deferredOperationEnqueued:
        _metrics.increment('deferredOperationsQueued');
        break;
      case SyncEventType.deferredOperationRetry:
        _metrics.increment('deferredOperationsRetried');
        break;
    }
  }

  void _maybeIncrementReconciliationOutcome(SyncEvent event) {
    final status = event.payload['status'] as String?;
    if (status == null) return;
    if (status.toLowerCase().contains('applied') || status.toLowerCase().contains('sent')) {
      _metrics.increment('successfulReconciliations');
    } else if (status.toLowerCase().contains('rejected') || status.toLowerCase().contains('failed')) {
      _metrics.increment('failedReconciliations');
    }
  }

  void _maybeIncrementForkResolved(SyncEvent event) {
    final status = event.payload['status'] as String?;
    if (status == null) return;
    if (status.toLowerCase().contains('resolved')) {
      _metrics.increment('forksResolved');
    }
  }
}
