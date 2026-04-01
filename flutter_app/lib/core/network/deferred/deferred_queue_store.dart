/// O6 — Persistence for deferred sync queue. Canonical JSON; fail fast on corruption.

import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';

/// Persists the deferred queue. Does not store private keys or engine internals.
abstract interface class DeferredQueueStore {
  /// Load all operations in FIFO order. Throws on corrupted data (fail fast).
  List<DeferredOperation> load();

  /// Save the full queue. Atomic update; canonical JSON.
  void save(List<DeferredOperation> operations);
}
