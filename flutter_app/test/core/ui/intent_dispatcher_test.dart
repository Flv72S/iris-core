import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/ui/intent_dispatcher.dart';
import 'package:iris_flutter_app/core/ui/intent_validator.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

void main() {
  late IntentDispatcher dispatcher;
  late List<Map<String, dynamic>> emitted;

  setUp(() {
    emitted = [];
    dispatcher = IntentDispatcher(
      validator: _AcceptValidator(),
      onValidIntent: (p) => emitted.add(Map<String, dynamic>.from(p)),
      intentToEvent: (i) => <String, dynamic>{'type': i.type, 'payload': i.payload},
    );
  });

  test('dispatch validates and emits on valid', () {
    final intent = UIIntent(type: 'A', payload: <String, dynamic>{'x': 1});
    dispatcher.dispatch(intent, ValidationContext());
    expect(emitted.length, 1);
    expect(emitted[0]['type'], 'A');
    expect(emitted[0]['payload'], <String, dynamic>{'x': 1});
  });

  test('dispatch throws on invalid', () {
    final dispatcherReject = IntentDispatcher(
      validator: _RejectValidator(),
      onValidIntent: (_) {},
    );
    expect(
      () => dispatcherReject.dispatch(
        UIIntent(type: 'X', payload: <String, dynamic>{}),
        ValidationContext(),
      ),
      throwsA(isA<IntentRejectedException>()),
    );
    expect(emitted, isEmpty);
  });
}

class _AcceptValidator extends IntentValidator {
  @override
  ValidationResult validate(UIIntent intent, ValidationContext context) =>
      ValidationResult.valid();
}

class _RejectValidator extends IntentValidator {
  @override
  ValidationResult validate(UIIntent intent, ValidationContext context) =>
      const ValidationResult.invalid('rejected');
}
