import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';

void main() {
  group('MediaLifecyclePlan', () {
    test('transitions list is immutable', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: [
          const MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
        ],
      );
      expect(
        () => plan.transitions.add(
          const MediaLifecycleTransition(
            from: MediaLifecycleState.localOnly,
            to: MediaLifecycleState.deleted,
            event: MediaLifecycleEvent.userDeleted,
          ),
        ),
        throwsUnsupportedError,
      );
    });

    test('equality and hashCode', () {
      final p1 = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
        ],
      );
      final p2 = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
        ],
      );

      expect(p1, equals(p2));
      expect(p1.hashCode, p2.hashCode);
    });

    test('allowsCloud returns true when cloud transition present', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.syncing,
            to: MediaLifecycleState.cloudStored,
            event: MediaLifecycleEvent.uploadSucceeded,
          ),
        ],
      );
      expect(plan.allowsCloud, isTrue);
    });

    test('allowsCloud returns false when no cloud transition', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
        ],
      );
      expect(plan.allowsCloud, isFalse);
    });

    test('includesArchive returns true when archive transition present', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.cloudStored,
            to: MediaLifecycleState.coldArchived,
            event: MediaLifecycleEvent.archiveCompleted,
          ),
        ],
      );
      expect(plan.includesArchive, isTrue);
    });

    test('terminalState returns last transition target', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.localOnly,
            to: MediaLifecycleState.deleted,
            event: MediaLifecycleEvent.deletionCompleted,
          ),
        ],
      );
      expect(plan.terminalState, MediaLifecycleState.deleted);
    });

    test('terminalState returns initial when no transitions', () {
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [],
      );
      expect(plan.terminalState, MediaLifecycleState.captured);
    });
  });
}
