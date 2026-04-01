import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_state.dart';

void main() {
  group('MediaLifecycleState', () {
    test('has all expected values', () {
      expect(MediaLifecycleState.values.length, 7);
      expect(MediaLifecycleState.captured.name, 'captured');
      expect(MediaLifecycleState.localOnly.name, 'localOnly');
      expect(MediaLifecycleState.syncing.name, 'syncing');
      expect(MediaLifecycleState.cloudStored.name, 'cloudStored');
      expect(MediaLifecycleState.coldArchived.name, 'coldArchived');
      expect(MediaLifecycleState.pendingDeletion.name, 'pendingDeletion');
      expect(MediaLifecycleState.deleted.name, 'deleted');
    });

    test('enum values are distinct', () {
      final set = MediaLifecycleState.values.toSet();
      expect(set.length, MediaLifecycleState.values.length);
    });
  });
}
