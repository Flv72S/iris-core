/// OX4 — Read-only projection state for UI. No mutation; no ledger access.

import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_engine.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_registry.dart';

typedef Unsubscribe = void Function();

/// Exposes projection data to UI. Reads only from ProjectionEngine; state is immutable view.
class UIStateBridge {
  UIStateBridge({
    required ProjectionEngine engine,
    required ProjectionRegistry registry,
  })  : _engine = engine,
        _registry = registry;

  final ProjectionEngine _engine;
  final ProjectionRegistry _registry;
  final Map<String, List<void Function(Object?)>> _listeners =
      <String, List<void Function(Object?)>>{};

  /// Returns current projection state for [id]. State must be treated as immutable.
  T getProjection<T>(String id, ProjectionDefinition<T> definition) {
    return _engine.getOrBuild(definition);
  }

  /// Subscribe to projection changes. Call [notifyProjectionChanged] when projection updates.
  Unsubscribe subscribe(String projectionId, void Function(Object? state) callback) {
    _listeners.putIfAbsent(projectionId, () => <void Function(Object?)>[]).add(callback);
    return () {
      _listeners[projectionId]?.remove(callback);
    };
  }

  /// Notify that projection [projectionId] may have changed. Call after engine update.
  void notifyProjectionChanged(String projectionId) {
    final def = _registry.get(projectionId);
    if (def == null) return;
    final state = _engine.getOrBuild(def);
    for (final cb in List<void Function(Object?)>.from(_listeners[projectionId] ?? [])) {
      cb(state);
    }
  }
}
