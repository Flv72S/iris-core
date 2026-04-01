import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/primitives/metadata_primitive.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_events.dart';
import 'package:iris_flutter_app/core/domain/primitives/relationship_graph.dart';

void main() {
  group('RelationshipEdge', () {
    test('holds from to type', () {
      const e = RelationshipEdge(from: 'a', to: 'b', type: 'link');
      expect(e.from, 'a');
      expect(e.to, 'b');
      expect(e.type, 'link');
    });
  });

  group('RelationshipGraphEvents', () {
    test('addEdge payload', () {
      final p = RelationshipGraphEvents.addEdge(from: 'a', to: 'b', type: 'dep', atHeight: 1);
      expect(p['eventType'], PrimitiveEventType.relationshipAdded);
      expect(p['from'], 'a');
      expect(p['to'], 'b');
      expect(p['type'], 'dep');
    });
    test('removeEdge payload', () {
      final p = RelationshipGraphEvents.removeEdge(from: 'a', to: 'b', type: 'dep', atHeight: 2);
      expect(p['eventType'], PrimitiveEventType.relationshipRemoved);
    });
  });

  group('MetadataPrimitive', () {
    test('MetadataPrimitive holds targetId key value', () {
      const m = MetadataPrimitive(targetId: 'obj1', key: 'tag', value: 'v');
      expect(m.targetId, 'obj1');
      expect(m.key, 'tag');
      expect(m.value, 'v');
    });
    test('setMetadata payload', () {
      final p = MetadataPrimitiveEvents.setMetadata(
        targetId: 'id',
        key: 'k',
        value: 'v',
        atHeight: 1,
      );
      expect(p['eventType'], PrimitiveEventType.metadataSet);
      expect(p['targetId'], 'id');
      expect(p['key'], 'k');
      expect(p['value'], 'v');
    });
  });
}
