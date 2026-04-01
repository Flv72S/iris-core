import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/ui/intent_validator.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

void main() {
  group('ValidationResult', () {
    test('valid', () {
      const r = ValidationResult.valid();
      expect(r.valid, isTrue);
      expect(r.message, '');
    });
    test('invalid', () {
      const r = ValidationResult.invalid('bad');
      expect(r.valid, isFalse);
      expect(r.message, 'bad');
    });
  });

  group('IntentValidator', () {
    test('rejects invalid type', () {
      final v = _TestValidator();
      final intent = UIIntent(type: 'INVALID', payload: <String, dynamic>{});
      final ctx = ValidationContext();
      final r = v.validate(intent, ctx);
      expect(r.valid, isFalse);
    });
    test('accepts valid type', () {
      final v = _TestValidator();
      final intent = UIIntent(type: 'OK', payload: <String, dynamic>{});
      final ctx = ValidationContext();
      final r = v.validate(intent, ctx);
      expect(r.valid, isTrue);
    });
  });
}

class _TestValidator extends IntentValidator {
  @override
  ValidationResult validate(UIIntent intent, ValidationContext context) {
    if (intent.type == 'OK') return ValidationResult.valid();
    return const ValidationResult.invalid('unknown type');
  }
}
