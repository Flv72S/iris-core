/// OX2 — Deterministic projection definition. Pure applyEvent; no side effects.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';

/// Definition of a projection: initial state, pure event application, version.
/// applyEvent must be pure (no side effects, no async, no randomness).
abstract class ProjectionDefinition<TState> {
  String get id;

  /// Initial state before any events.
  TState initialState();

  /// Pure: same (state, event) → same result. No mutation of state or event.
  TState applyEvent(TState state, DeterministicEvent event);

  /// Schema/definition version; change triggers rebuild.
  int getVersion();

  /// Canonical map for deterministic hashing. Must be pure and deterministic.
  Map<String, dynamic> stateToCanonicalMap(TState state);
}
