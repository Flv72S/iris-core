import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/media_reference.dart';
import 'package:iris_flutter_app/flow_media/physical_location.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_snapshot.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';

void main() {
  group('MediaLifecycleSnapshot', () {
    test('equality and hashCode', () {
      const media = MediaReference(
        hash: 'sha256:test123',
        sizeBytes: 5000,
        mimeType: 'image/png',
        mediaPolicyId: 'MEDIA_FREE_V1',
        location: PhysicalLocation.localDevice,
      );
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

      final snap1 = MediaLifecycleSnapshot(media: media, plan: plan);
      final snap2 = MediaLifecycleSnapshot(media: media, plan: plan);

      expect(snap1, equals(snap2));
      expect(snap1.hashCode, snap2.hashCode);
    });

    test('different media produces different snapshot', () {
      const media1 = MediaReference(
        hash: 'sha256:aaa',
        sizeBytes: 1000,
        mimeType: 'image/png',
        mediaPolicyId: 'MEDIA_FREE_V1',
        location: PhysicalLocation.localDevice,
      );
      const media2 = MediaReference(
        hash: 'sha256:bbb',
        sizeBytes: 2000,
        mimeType: 'image/png',
        mediaPolicyId: 'MEDIA_FREE_V1',
        location: PhysicalLocation.localDevice,
      );
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [],
      );

      final snap1 = MediaLifecycleSnapshot(media: media1, plan: plan);
      final snap2 = MediaLifecycleSnapshot(media: media2, plan: plan);

      expect(snap1, isNot(equals(snap2)));
    });

    test('toJson produces serializable map', () {
      const media = MediaReference(
        hash: 'sha256:json123',
        sizeBytes: 3000,
        mimeType: 'video/mp4',
        mediaPolicyId: 'MEDIA_PRO_V1',
        location: PhysicalLocation.cloud,
      );
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
      final snap = MediaLifecycleSnapshot(media: media, plan: plan);
      final json = snap.toJson();

      expect(json['media'], isA<Map>());
      expect(json['plan'], isA<Map>());
      expect((json['media'] as Map)['hash'], 'sha256:json123');
      expect((json['plan'] as Map)['initial'], 'captured');
    });

    test('toString is readable', () {
      const media = MediaReference(
        hash: 'sha256:str123',
        sizeBytes: 4000,
        mimeType: 'image/jpg',
        mediaPolicyId: 'MEDIA_ENT_V1',
        location: PhysicalLocation.coldArchive,
      );
      final plan = MediaLifecyclePlan(
        initial: MediaLifecycleState.captured,
        transitions: const [],
      );
      final snap = MediaLifecycleSnapshot(media: media, plan: plan);

      expect(snap.toString(), contains('sha256:str123'));
    });
  });
}
