// Media Lifecycle — Plan. Describes allowed path for a media asset.

import 'media_lifecycle_state.dart';
import 'media_lifecycle_transition.dart';

/// Describes the complete lifecycle path allowed for a media asset.
/// Immutable; deterministic; derived from enforcement decision.
class MediaLifecyclePlan {
  MediaLifecyclePlan({
    required this.initial,
    required List<MediaLifecycleTransition> transitions,
  }) : transitions = List.unmodifiable(transitions);

  /// Initial state after capture.
  final MediaLifecycleState initial;

  /// Ordered list of allowed transitions.
  final List<MediaLifecycleTransition> transitions;

  /// Returns true if this plan allows cloud storage.
  bool get allowsCloud =>
      transitions.any((t) => t.to == MediaLifecycleState.cloudStored);

  /// Returns true if this plan includes cold archive.
  bool get includesArchive =>
      transitions.any((t) => t.to == MediaLifecycleState.coldArchived);

  /// Returns the terminal state of this plan.
  MediaLifecycleState get terminalState {
    if (transitions.isEmpty) return initial;
    return transitions.last.to;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaLifecyclePlan &&
          initial == other.initial &&
          _transitionsEqual(transitions, other.transitions));

  static bool _transitionsEqual(
    List<MediaLifecycleTransition> a,
    List<MediaLifecycleTransition> b,
  ) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(initial, Object.hashAll(transitions));

  Map<String, Object> toJson() => {
        'initial': initial.name,
        'transitions': transitions.map((t) => t.toJson()).toList(),
      };

  @override
  String toString() {
    final sb = StringBuffer('MediaLifecyclePlan(${initial.name}');
    for (final t in transitions) {
      sb.write(' -> ${t.to.name}');
    }
    sb.write(')');
    return sb.toString();
  }
}
