import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/domain/primitives/primitive_registry.dart';

void main() {
  late PrimitiveRegistry registry;

  setUp(() {
    registry = PrimitiveRegistry();
  });

  test('register and get', () {
    Object? handler(String type, Map<String, dynamic> payload) => null;
    registry.register('task', handler);
    expect(registry.get('task'), same(handler));
    expect(registry.get('missing'), isNull);
  });
  test('duplicate type throws', () {
    registry.register('t', (String type, Map<String, dynamic> payload) => null);
    expect(() => registry.register('t', (String type, Map<String, dynamic> payload) => null),
        throwsStateError);
  });
  test('registeredTypes returns all', () {
    registry.register('a', (String type, Map<String, dynamic> payload) => null);
    registry.register('b', (String type, Map<String, dynamic> payload) => null);
    expect(registry.registeredTypes, containsAll(['a', 'b']));
    expect(registry.registeredTypes.length, 2);
  });
}
