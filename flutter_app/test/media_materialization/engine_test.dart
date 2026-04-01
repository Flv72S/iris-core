import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';
import 'package:iris_flutter_app/media_materialization/media_materialization_engine.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  const engine = MediaMaterializationEngine();
  const mediaId = 'test-media-123';

  MediaLifecyclePlan localOnly() => MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.localOnly,
            to: MediaLifecycleState.pendingDeletion,
            event: MediaLifecycleEvent.retentionExpired,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.pendingDeletion,
            to: MediaLifecycleState.deleted,
            event: MediaLifecycleEvent.deletionCompleted,
          ),
        ],
      );

  MediaLifecyclePlan cloudEnabled() => MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.localOnly,
            to: MediaLifecycleState.syncing,
            event: MediaLifecycleEvent.syncStarted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.syncing,
            to: MediaLifecycleState.cloudStored,
            event: MediaLifecycleEvent.uploadSucceeded,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.cloudStored,
            to: MediaLifecycleState.pendingDeletion,
            event: MediaLifecycleEvent.retentionExpired,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.pendingDeletion,
            to: MediaLifecycleState.deleted,
            event: MediaLifecycleEvent.deletionCompleted,
          ),
        ],
      );

  MediaLifecyclePlan withArchive() => MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [
          MediaLifecycleTransition(
            from: MediaLifecycleState.captured,
            to: MediaLifecycleState.localOnly,
            event: MediaLifecycleEvent.localPersisted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.localOnly,
            to: MediaLifecycleState.syncing,
            event: MediaLifecycleEvent.syncStarted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.syncing,
            to: MediaLifecycleState.cloudStored,
            event: MediaLifecycleEvent.uploadSucceeded,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.cloudStored,
            to: MediaLifecycleState.coldArchived,
            event: MediaLifecycleEvent.archiveCompleted,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.coldArchived,
            to: MediaLifecycleState.pendingDeletion,
            event: MediaLifecycleEvent.retentionExpired,
          ),
          MediaLifecycleTransition(
            from: MediaLifecycleState.pendingDeletion,
            to: MediaLifecycleState.deleted,
            event: MediaLifecycleEvent.deletionCompleted,
          ),
        ],
      );

  test('determinism: same lifecycle same plan', () {
    final p1 = engine.buildOperationPlan(cloudEnabled(), mediaId: mediaId);
    final p2 = engine.buildOperationPlan(cloudEnabled(), mediaId: mediaId);
    expect(p1, equals(p2));
    expect(p1.hashCode, p2.hashCode);
  });

  test('local-only: no cloud ops', () {
    final plan = engine.buildOperationPlan(localOnly(), mediaId: mediaId);
    expect(plan.hasCloudOperations, isFalse);
    expect(plan.hasArchiveOperations, isFalse);
    expect(plan.operations.any((op) => op.type == PhysicalOperationType.storeLocal), isTrue);
    expect(plan.hasDeleteOperations, isTrue);
  });

  test('cloud: includes uploadCloud', () {
    final plan = engine.buildOperationPlan(cloudEnabled(), mediaId: mediaId);
    expect(plan.hasCloudOperations, isTrue);
  });

  test('archive: includes archiveCold', () {
    final plan = engine.buildOperationPlan(withArchive(), mediaId: mediaId);
    expect(plan.hasArchiveOperations, isTrue);
  });

  test('delete: all plans have delete', () {
    expect(engine.buildOperationPlan(localOnly(), mediaId: mediaId).hasDeleteOperations, isTrue);
    expect(engine.buildOperationPlan(cloudEnabled(), mediaId: mediaId).hasDeleteOperations, isTrue);
    expect(engine.buildOperationPlan(withArchive(), mediaId: mediaId).hasDeleteOperations, isTrue);
  });

  test('no duplicate operations', () {
    final plan = engine.buildOperationPlan(withArchive(), mediaId: mediaId);
    final types = plan.operations.map((op) => op.type).toList();
    expect(types.length, types.toSet().length);
  });
}
