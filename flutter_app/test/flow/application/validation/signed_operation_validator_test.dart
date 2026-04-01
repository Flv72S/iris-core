import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_request.dart';
import 'package:iris_flutter_app/flow/application/validation/signed_operation_validator.dart';
import 'package:iris_flutter_app/flow/application/validation/validation_error.dart';
import 'package:iris_flutter_app/flow/application/validation/validation_result.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';

SignedPayload _sig(List<int> bytes, {String algorithm = 'HMAC-SHA256'}) =>
    SignedPayload(
      signatureBytes: bytes,
      metadata: SignatureMetadata(signerId: 's', algorithm: algorithm),
    );

OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

SignedOperationRequest _request({
  String operationId = 'op-1',
  String resourceId = 'res-1',
  List<int>? payload,
  SignedPayload? signature,
  OperationEnvelopeMetadata? metadata,
}) {
  return SignedOperationRequest(
    operationId: operationId,
    resourceId: resourceId,
    payload: payload ?? [1, 2, 3],
    signature: signature ?? _sig([10, 20]),
    metadata: metadata ?? _meta({'k': 'v'}),
  );
}

void main() {
  group('SignedOperationValidator', () {
    late SignedOperationValidator validator;

    setUp(() {
      validator = SignedOperationValidator();
    });

    group('1. Valid Request', () {
      test('all fields valid → isValid == true', () {
        final request = _request();
        final result = validator.validate(request);
        expect(result.isValid, true);
        expect(result.errors, isEmpty);
      });
    });

    group('2. operationId empty', () {
      test('operationId empty → error code operation_id_empty', () {
        final request = _request(operationId: '');
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.length, 1);
        expect(result.errors[0].code, 'operation_id_empty');
      });
      test('operationId whitespace only → error code operation_id_empty', () {
        final request = _request(operationId: '   \t\n');
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.any((e) => e.code == 'operation_id_empty'), true);
      });
    });

    group('3. payload empty', () {
      test('payload empty → error code payload_empty', () {
        final request = _request(payload: []);
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.any((e) => e.code == 'payload_empty'), true);
      });
    });

    group('4. signature missing/empty', () {
      test('signature.signatureBytes empty → error code signature_empty', () {
        final request = _request(signature: _sig([]));
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.any((e) => e.code == 'signature_empty'), true);
      });
      test('signature.metadata.algorithm empty → error code signature_algorithm_empty', () {
        final request = _request(signature: _sig([1], algorithm: ''));
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.any((e) => e.code == 'signature_algorithm_empty'), true);
      });
    });

    group('5. metadata invalid', () {
      test('empty key in metadata → error', () {
        final request = _request(metadata: _meta({'': 'v'}));
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.any((e) => e.code == 'metadata_key_empty'), true);
      });
      test('whitespace-only key in metadata → error', () {
        final request = _request(metadata: _meta({'  ': 'v'}));
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.any((e) => e.code == 'metadata_key_empty'), true);
      });
    });

    group('6. Multiple Errors Aggregation', () {
      test('fully invalid request → multiple errors in deterministic order', () {
        final request = SignedOperationRequest(
          operationId: '',
          resourceId: '',
          payload: [],
          signature: _sig([], algorithm: ''),
          metadata: _meta({'': 'x'}),
        );
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(result.errors.length, greaterThanOrEqualTo(5));
        final codes = result.errors.map((e) => e.code).toList();
        expect(codes[0], 'operation_id_empty');
        expect(codes[1], 'resource_id_empty');
        expect(codes[2], 'payload_empty');
        expect(codes[3], 'signature_empty');
        expect(codes[4], 'signature_algorithm_empty');
        expect(codes[5], 'metadata_key_empty');
      });
      test('returned errors list is unmodifiable', () {
        final request = _request(operationId: '');
        final result = validator.validate(request);
        expect(result.isValid, false);
        expect(
          () => result.errors.add(const ValidationError(code: 'x', message: 'y')),
          throwsA(isA<UnsupportedError>()),
        );
      });
    });

    group('7. Determinism Guard', () {
      test('validation module does not use DateTime, Random, UUID, serializer, orchestrator', () async {
        final dir = Directory('lib/flow/application/validation');
        expect(await dir.exists(), true);
        await for (final e in dir.list()) {
          if (e is File && e.path.replaceAll(r'\', '/').endsWith('.dart')) {
            final content = await e.readAsString();
            expect(content.contains('DateTime'), false);
            expect(content.contains('Random'), false);
            expect(content.contains('Uuid'), false);
            expect(content.contains('serializer'), false);
            expect(content.contains('orchestrator'), false);
          }
        }
      });
    });
  });

  group('ValidationResult', () {
    test('valid() has empty unmodifiable errors', () {
      final result = ValidationResult.valid();
      expect(result.isValid, true);
      expect(result.errors, isEmpty);
      expect(
        () => result.errors.add(const ValidationError(code: 'x', message: 'y')),
        throwsA(isA<UnsupportedError>()),
      );
    });
    test('invalid() copies list to unmodifiable', () {
      final errors = [
        const ValidationError(code: 'a', message: 'b'),
      ];
      final result = ValidationResult.invalid(errors);
      errors.add(const ValidationError(code: 'c', message: 'd'));
      expect(result.errors.length, 1);
    });
  });
}
