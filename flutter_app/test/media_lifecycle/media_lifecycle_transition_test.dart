import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_event.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_transition.dart';

void main() {
  group('MediaLifecycleTransition', () {
    test('equality and hashCode', () {
      const t1 = MediaLifecycleTransition(
        from: MediaLifecycleState.localOnly,
        to: MediaLifecycleState.syncing,
        event: MediaLifecycleEvent.syncStarted,
      );
      const t2 = MediaLifecycleTransition(
        from: MediaLifecycleState.localOnly,
        to: MediaLifecycleState.syncing,
        event: MediaLifecycleEvent.syncStarted,
      );
      const t3 = MediaLifecycleTransition(
        from: MediaLifecycleState.syncing,
        to: MediaLifecycleState.cloudStored,
        event: MediaLifecycleEvent.uploadSucceeded,
      );

      expect(t1, equals(t2));
      expect(t1.hashCode, t2.hashCode);
      expect(t1, isNot(equals(t3)));
    });

    test('toJson produces correct map', () {
      const t = MediaLifecycleTransition(
        from: MediaLifecycleState.captured,
        to: MediaLifecycleState.localOnly,
        event: MediaLifecycleEvent.localPersisted,
      );
      final json = t.toJson();
      expect(json['from'], 'captured');
      expect(json['to'], 'localOnly');
      expect(json['event'], 'localPersisted');
    });

    test('toString is readable', () {
      const t = MediaLifecycleTransition(
        from: MediaLifecycleState.localOnly,
        to: MediaLifecycleState.syncing,
        event: MediaLifecycleEvent.syncStarted,
      );
      expect(t.toString(), contains('localOnly'));
      expect(t.toString(), contains('syncing'));
      expect(t.toString(), contains('syncStarted'));
    });
  });
}
