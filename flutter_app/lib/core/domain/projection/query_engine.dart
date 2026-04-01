/// OX2 — Deterministic query layer. Selector must be pure; no mutation.

import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_engine.dart';

/// Runs pure selectors over projection state. Never mutates state.
class QueryEngine {
  QueryEngine(this._engine);

  final ProjectionEngine _engine;

  /// Returns result of selector(projectionState). Selector must be pure (no side effects, no mutation).
  R query<T, R>(String projectionId, ProjectionDefinition<T> definition, R Function(T state) selector) {
    final state = _engine.getOrBuild(definition);
    return selector(state);
  }
}
