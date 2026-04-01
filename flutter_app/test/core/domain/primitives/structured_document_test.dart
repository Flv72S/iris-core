import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/primitives/object_lifecycle.dart';
import 'package:iris_flutter_app/core/domain/primitives/structured_document.dart';

void main() {
  group('StructuredDocument', () {
    test('createPayload uses ObjectLifecycleEvents', () {
      final p = StructuredDocument.createPayload(
        type: 'note',
        schemaVersion: 1,
        content: <String, dynamic>{'text': 'hello'},
        atHeight: 1,
      );
      expect(p['schemaVersion'], isNull);
      expect(p['payload']['schemaVersion'], 1);
      expect(p['payload']['content'], <String, dynamic>{'text': 'hello'});
    });
    test('patchPayload delegates to updateObject', () {
      final p = StructuredDocument.patchPayload(
        id: 'id1',
        patch: <String, dynamic>{'title': 'x'},
        version: 2,
        atHeight: 5,
      );
      expect(p['objectId'], 'id1');
      expect(p['version'], 2);
      expect(p['patch'], <String, dynamic>{'title': 'x'});
    });
  });
}
