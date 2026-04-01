// I7 - Observability hook. Interface for intercepting execution events.

import 'observability_event.dart';

/// Abstract interface for observability hooks.
/// Implementations can log, audit, or relay events to external systems.
abstract interface class ObservabilityHook {
  /// Called when an observability event occurs.
  void onEvent(ObservabilityEvent event);
}

/// No-op hook that discards all events.
/// Useful as a default when no observability is needed.
class NoOpObservabilityHook implements ObservabilityHook {
  const NoOpObservabilityHook();

  @override
  void onEvent(ObservabilityEvent event) {
    // Intentionally empty - discards all events
  }
}

/// Hook that collects events in memory for testing and replay.
class CollectingObservabilityHook implements ObservabilityHook {
  CollectingObservabilityHook();

  final List<ObservabilityEvent> _events = [];

  /// Returns an unmodifiable view of collected events.
  List<ObservabilityEvent> get events => List.unmodifiable(_events);

  /// Returns the number of collected events.
  int get length => _events.length;

  /// Returns true if no events have been collected.
  bool get isEmpty => _events.isEmpty;

  /// Returns true if events have been collected.
  bool get isNotEmpty => _events.isNotEmpty;

  /// Returns events of a specific type.
  List<ObservabilityEvent> eventsOfType(ObservabilityEventType type) {
    return _events.where((e) => e.eventType == type).toList();
  }

  /// Returns all failure events.
  List<ObservabilityEvent> get failures {
    return _events.where((e) => e.isFailure).toList();
  }

  /// Returns all success events.
  List<ObservabilityEvent> get successes {
    return _events.where((e) => e.isSuccess).toList();
  }

  /// Clears all collected events.
  void clear() => _events.clear();

  @override
  void onEvent(ObservabilityEvent event) {
    _events.add(event);
  }
}

/// Hook that delegates to multiple hooks.
class CompositeObservabilityHook implements ObservabilityHook {
  const CompositeObservabilityHook(this._hooks);

  final List<ObservabilityHook> _hooks;

  @override
  void onEvent(ObservabilityEvent event) {
    for (final hook in _hooks) {
      hook.onEvent(event);
    }
  }
}

/// Hook that filters events before delegating.
class FilteringObservabilityHook implements ObservabilityHook {
  const FilteringObservabilityHook({
    required this.delegate,
    required this.filter,
  });

  final ObservabilityHook delegate;
  final bool Function(ObservabilityEvent) filter;

  @override
  void onEvent(ObservabilityEvent event) {
    if (filter(event)) {
      delegate.onEvent(event);
    }
  }

  /// Creates a hook that only passes failure events.
  factory FilteringObservabilityHook.failuresOnly(ObservabilityHook delegate) {
    return FilteringObservabilityHook(
      delegate: delegate,
      filter: (e) => e.isFailure,
    );
  }

  /// Creates a hook that only passes specific event types.
  factory FilteringObservabilityHook.ofTypes(
    ObservabilityHook delegate,
    Set<ObservabilityEventType> types,
  ) {
    return FilteringObservabilityHook(
      delegate: delegate,
      filter: (e) => types.contains(e.eventType),
    );
  }
}
