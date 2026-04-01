/// OX2 — Build and maintain projections from ledger events. Deterministic; no mutation of ledger.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_snapshot.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_store.dart';

/// Builds projections from event list. Rebuilds on fork; supports incremental apply.
class ProjectionEngine {
  ProjectionEngine({
    required ProjectionRegistry registry,
    required ProjectionStore store,
  })  : _registry = registry,
        _store = store;

  final ProjectionRegistry _registry;
  final ProjectionStore _store;
  final List<DeterministicEvent> _events = [];
  final Map<String, Object?> _cache = {};

  /// Current ledger height (number of events applied).
  int get ledgerHeight => _events.length;

  /// Sets the event stream (e.g. after fork or compaction). Clears cache so next access rebuilds.
  void setEvents(List<DeterministicEvent> events) {
    _events.clear();
    _events.addAll(events);
    _cache.clear();
  }

  /// Appends one event and updates all cached projections incrementally.
  void applyNewEvent(DeterministicEvent event) {
    _events.add(event);
    for (final def in _registry.getAll()) {
      final id = def.id;
      final current = _cache[id];
      if (current == null) continue;
      final next = def.applyEvent(current, event);
      _cache[id] = next;
      _persist(def, next, _events.length, def.getVersion());
    }
  }

  /// Builds projection from initial state + all events. Caches and persists.
  T build<T>(ProjectionDefinition<T> definition) {
    final id = definition.id;
    T state = definition.initialState();
    for (final event in _events) {
      state = definition.applyEvent(state, event);
    }
    _cache[id] = state;
    _persist(definition, state, _events.length, definition.getVersion());
    return state;
  }

  /// Rebuilds all registered projections from current events.
  void rebuildAll() {
    _cache.clear();
    for (final def in _registry.getAll()) {
      build(def as ProjectionDefinition<Object?>);
    }
  }

  /// Invalidates all projections (e.g. on fork). Clears cache and store.
  void invalidate() {
    _cache.clear();
    _store.clearAll();
  }

  /// Returns current projection state if built/cached; otherwise builds and returns.
  T getOrBuild<T>(ProjectionDefinition<T> definition) {
    final id = definition.id;
    final cached = _cache[id];
    if (cached != null) return cached as T;
    return build(definition);
  }

  /// Last snapshot metadata for a projection (if stored and hash valid).
  ProjectionSnapshot? getSnapshot(String projectionId) {
    final entry = _store.load(projectionId);
    if (entry == null) return null;
    return ProjectionSnapshot(
      projectionId: projectionId,
      stateHash: entry.stateHash,
      ledgerHeight: entry.ledgerHeight,
      version: entry.version,
    );
  }

  void _persist<T>(ProjectionDefinition<T> definition, T state, int ledgerHeight, int version) {
    final map = definition.stateToCanonicalMap(state);
    _store.save(definition.id, map, version, ledgerHeight);
  }
}
