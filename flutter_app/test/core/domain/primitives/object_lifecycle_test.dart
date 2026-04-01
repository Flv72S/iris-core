import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/primitives/object_lifecycle.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';

void main() {
  group('deterministicObjectId', () {
    test('same inputs produce same id', () {
      final a = deterministicObjectId('doc', 1, <String, dynamic>{'k': 1});
      final b = deterministicObjectId('doc', 1, <String, dynamic>{'k': 1});
      expect(a, b);
    });
    test('different type produces different id', () {
      final a = deterministicObjectId('doc', 1, <String, dynamic>{});
      final b = deterministicObjectId('task', 1, <String, dynamic>{});
      expect(a, isNot(b));
    });
    test('different height produces different id', () {
      final a = deterministicObjectId('doc', 1, <String, dynamic>{});
      final b = deterministicObjectId('doc', 2, <String, dynamic>{});
      expect(a, isNot(b));
    });
    test('id contains type and height', () {
      final id = deterministicObjectId('myType', 5, <String, dynamic>{});
      expect(id.startsWith('myType_5_'), isTrue);
    });
  });

  group('ObjectLifecycleEvents', () {
    test('createObject payload has version 1 and eventType', () {
      final p = ObjectLifecycleEvents.createObject('t', <String, dynamic>{'x': 1}, 10);
      expect(p['eventType'], PrimitiveEventType.objectCreated);
      expect(p['version'], 1);
      expect(p['createdAtHeight'], 10);
      expect(p['updatedAtHeight'], 10);
      expect(p['payload'], <String, dynamic>{'x': 1});
    });
    test('updateObject payload has version and patch', () {
      final p = ObjectLifecycleEvents.updateObject('id1', <String, dynamic>{'a': 2}, 2, 20);
      expect(p['eventType'], PrimitiveEventType.objectUpdated);
      expect(p['objectId'], 'id1');
      expect(p['version'], 2);
      expect(p['patch'], <String, dynamic>{'a': 2});
    });
    test('archiveObject and deleteObject payloads', () {
      final ar = ObjectLifecycleEvents.archiveObject('id1', 1, 3);
      expect(ar['eventType'], PrimitiveEventType.objectArchived);
      final del = ObjectLifecycleEvents.deleteObject('id1', 2, 4);
      expect(del['eventType'], PrimitiveEventType.objectDeleted);
    });
  });
}
