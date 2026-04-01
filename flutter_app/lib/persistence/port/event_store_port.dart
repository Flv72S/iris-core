// J1 — EventStorePort. Pure contract.

import 'package:iris_flutter_app/persistence/persisted_types.dart';

abstract interface class EventStorePort {
  Future<void> appendEvent(PersistedObservabilityEvent event);
  Future<List<PersistedObservabilityEvent>> getEvents(String executionId);
  Future<void> deleteEvents(String executionId);
}
