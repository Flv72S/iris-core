/// O6 — FIFO deferred sync queue. Persistent; atomic updates; no duplicate IDs.

import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_queue_store.dart';

class DeferredSyncQueue {
  DeferredSyncQueue({required DeferredQueueStore store}) : _store = store;

  final DeferredQueueStore _store;

  /// Enqueue [operation]. Throws if an operation with the same [operation.id] already exists.
  void enqueue(DeferredOperation operation) {
    final list = _store.load();
    if (list.any((o) => o.id == operation.id)) {
      throw StateError('Duplicate operation id: ${operation.id}');
    }
    list.add(operation);
    _store.save(list);
  }

  /// Remove and return the first operation, or null if empty.
  DeferredOperation? dequeue() {
    final list = _store.load();
    if (list.isEmpty) return null;
    final first = list.removeAt(0);
    _store.save(list);
    return first;
  }

  /// Return the first operation without removing it, or null if empty.
  DeferredOperation? peek() {
    final list = _store.load();
    return list.isEmpty ? null : list.first;
  }

  /// Increment [retryCount] for the operation with [operationId]. No silent deletion.
  /// If not found, does nothing (idempotent for missing id).
  void markFailed(String operationId) {
    final list = _store.load();
    final index = list.indexWhere((o) => o.id == operationId);
    if (index < 0) return;
    list[index] = list[index].withIncrementedRetry();
    _store.save(list);
  }

  /// Remove the operation with [operationId] from the queue.
  void markCompleted(String operationId) {
    final list = _store.load();
    list.removeWhere((o) => o.id == operationId);
    _store.save(list);
  }

  /// Return all operations in FIFO order. No silent deletion.
  List<DeferredOperation> getAll() => _store.load();
}
