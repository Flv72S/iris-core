/// O6 — Coordinates queue and transport. Resumes processing on connect; validation enforced.

import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_sync_queue.dart';

/// Executes one deferred operation (e.g. build envelope, validate, send).
/// Returns true if sent successfully; false to stop processing (e.g. validation failed).
typedef DeferredOperationExecutor = Future<bool> Function(DeferredOperation operation);

/// Coordinates [DeferredSyncQueue] and sync execution. Calls [onTransportConnected]
/// when transport reconnects to resume processing. Stops on first failure; no auto-merge.
class DeferredSyncManager {
  DeferredSyncManager({
    required DeferredSyncQueue queue,
    required DeferredOperationExecutor executeOperation,
  })  : _queue = queue,
        _executeOperation = executeOperation;

  final DeferredSyncQueue _queue;
  final DeferredOperationExecutor _executeOperation;

  /// Call when transport becomes connected to resume processing.
  /// Processes operations sequentially; stops on first failure (validation or send).
  /// Respects replay-before-merge: executor must not mutate state until validation passes.
  Future<void> onTransportConnected() => _processLoop();

  /// Process queue until empty or an operation fails.
  Future<void> _processLoop() async {
    while (true) {
      final op = _queue.peek();
      if (op == null) break;
      final success = await _executeOperation(op);
      if (!success) {
        _queue.markFailed(op.id);
        break;
      }
      _queue.markCompleted(op.id);
    }
  }
}
