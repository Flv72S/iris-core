// Media Lifecycle — Transition value object. Immutable; no side effects.

import 'media_lifecycle_event.dart';
import 'media_lifecycle_state.dart';

/// Represents a single state transition in the media lifecycle.
/// Immutable; equality by value; no side effects.
class MediaLifecycleTransition {
  const MediaLifecycleTransition({
    required this.from,
    required this.to,
    required this.event,
  });

  /// State before transition.
  final MediaLifecycleState from;

  /// State after transition.
  final MediaLifecycleState to;

  /// Event that triggers this transition.
  final MediaLifecycleEvent event;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaLifecycleTransition &&
          from == other.from &&
          to == other.to &&
          event == other.event);

  @override
  int get hashCode => Object.hash(from, to, event);

  Map<String, Object> toJson() => {
        'from': from.name,
        'to': to.name,
        'event': event.name,
      };

  @override
  String toString() => '${from.name} --[${event.name}]--> ${to.name}';
}
