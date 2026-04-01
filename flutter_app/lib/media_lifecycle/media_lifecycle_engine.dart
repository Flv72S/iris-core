// Media Lifecycle — Engine. Builds lifecycle plan from enforcement decision.

import 'package:iris_flutter_app/flow_media/media_enforcement_decision.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';

import 'media_lifecycle_event.dart';
import 'media_lifecycle_plan.dart';
import 'media_lifecycle_state.dart';
import 'media_lifecycle_transition.dart';

/// Builds a MediaLifecyclePlan from MediaReference and MediaEnforcementDecision.
/// Purely deterministic; no autonomous decisions; no side effects.
class MediaLifecycleEngine {
  const MediaLifecycleEngine();

  /// Builds a lifecycle plan based on the enforcement decision.
  /// The plan describes what transitions are allowed, not what will happen.
  MediaLifecyclePlan buildPlan(
    MediaReference media,
    MediaEnforcementDecision decision,
  ) {
    final transitions = <MediaLifecycleTransition>[];

    // All media starts captured → local persistence
    transitions.add(const MediaLifecycleTransition(
      from: MediaLifecycleState.captured,
      to: MediaLifecycleState.localOnly,
      event: MediaLifecycleEvent.localPersisted,
    ));

    if (decision.localOnly || !decision.cloudAllowed) {
      // Local-only path: stays local until deletion
      transitions.add(const MediaLifecycleTransition(
        from: MediaLifecycleState.localOnly,
        to: MediaLifecycleState.pendingDeletion,
        event: MediaLifecycleEvent.retentionExpired,
      ));
      transitions.add(const MediaLifecycleTransition(
        from: MediaLifecycleState.localOnly,
        to: MediaLifecycleState.pendingDeletion,
        event: MediaLifecycleEvent.userDeleted,
      ));
    } else {
      // Cloud path: local → syncing → cloud
      transitions.add(const MediaLifecycleTransition(
        from: MediaLifecycleState.localOnly,
        to: MediaLifecycleState.syncing,
        event: MediaLifecycleEvent.syncStarted,
      ));
      transitions.add(const MediaLifecycleTransition(
        from: MediaLifecycleState.syncing,
        to: MediaLifecycleState.cloudStored,
        event: MediaLifecycleEvent.uploadSucceeded,
      ));
      transitions.add(const MediaLifecycleTransition(
        from: MediaLifecycleState.syncing,
        to: MediaLifecycleState.localOnly,
        event: MediaLifecycleEvent.uploadFailed,
      ));

      if (decision.coldArchiveAllowed) {
        // Archive path: cloud → cold archive → pending deletion
        transitions.add(const MediaLifecycleTransition(
          from: MediaLifecycleState.cloudStored,
          to: MediaLifecycleState.coldArchived,
          event: MediaLifecycleEvent.archiveCompleted,
        ));
        transitions.add(const MediaLifecycleTransition(
          from: MediaLifecycleState.coldArchived,
          to: MediaLifecycleState.pendingDeletion,
          event: MediaLifecycleEvent.retentionExpired,
        ));
        transitions.add(const MediaLifecycleTransition(
          from: MediaLifecycleState.coldArchived,
          to: MediaLifecycleState.pendingDeletion,
          event: MediaLifecycleEvent.userDeleted,
        ));
      } else {
        // No archive: cloud → pending deletion directly
        transitions.add(const MediaLifecycleTransition(
          from: MediaLifecycleState.cloudStored,
          to: MediaLifecycleState.pendingDeletion,
          event: MediaLifecycleEvent.retentionExpired,
        ));
        transitions.add(const MediaLifecycleTransition(
          from: MediaLifecycleState.cloudStored,
          to: MediaLifecycleState.pendingDeletion,
          event: MediaLifecycleEvent.userDeleted,
        ));
      }
    }

    // Terminal: pending deletion → deleted
    transitions.add(const MediaLifecycleTransition(
      from: MediaLifecycleState.pendingDeletion,
      to: MediaLifecycleState.deleted,
      event: MediaLifecycleEvent.deletionCompleted,
    ));

    return MediaLifecyclePlan(
      initial: MediaLifecycleState.captured,
      transitions: transitions,
    );
  }
}
