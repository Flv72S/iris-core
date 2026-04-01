/// O6 — In-memory store for tests. No file I/O.

import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_queue_store.dart';

class InMemoryDeferredQueueStore implements DeferredQueueStore {
  List<DeferredOperation> _operations = [];

  @override
  List<DeferredOperation> load() =>
      _operations.map((o) => o.copyWith()).toList();

  @override
  void save(List<DeferredOperation> operations) {
    _operations = operations.map((o) => o.copyWith()).toList();
  }
}
