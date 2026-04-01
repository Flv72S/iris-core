import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';

SignedPayload _signedPayload(List<int> signatureBytes) => SignedPayload(
      signatureBytes: signatureBytes,
      metadata: const SignatureMetadata(signerId: 's', algorithm: 'a'),
    );

OperationEnvelopeMetadata _meta(Map<String, String> attrs) =>
    OperationEnvelopeMetadata(attributes: attrs);

OperationEnvelope _envelope({
  String operationId = 'op-1',
  String resourceId = 'res-1',
  List<int>? payload,
  SignedPayload? signature,
  OperationEnvelopeMetadata? metadata,
}) {
  return OperationEnvelope(
    operationId: operationId,
    resourceId: resourceId,
    payload: payload ?? [1, 2, 3],
    signature: signature ?? _signedPayload([10, 20]),
    metadata: metadata ?? _meta({'k': 'v'}),
  );
}

void main() {
  group('OperationEnvelope', () {
    group('1. Construction Valid', () {
      test('constructs with valid data', () {
        expect(
          () => _envelope(),
          returnsNormally,
        );
      });
    });

    group('2. Invalid OperationId', () {
      test('empty operationId throws', () {
        expect(
          () => _envelope(operationId: ''),
          throwsA(isA<AssertionError>()),
        );
      });
      test('whitespace-only operationId throws', () {
        expect(
          () => _envelope(operationId: '   '),
          throwsA(isA<AssertionError>()),
        );
      });
    });

    group('3. Invalid ResourceId', () {
      test('empty resourceId throws', () {
        expect(
          () => _envelope(resourceId: ''),
          throwsA(isA<AssertionError>()),
        );
      });
      test('whitespace-only resourceId throws', () {
        expect(
          () => _envelope(resourceId: '\t\n'),
          throwsA(isA<AssertionError>()),
        );
      });
    });

    group('4. Invalid Payload', () {
      test('empty payload throws', () {
        expect(
          () => _envelope(payload: []),
          throwsA(isA<AssertionError>()),
        );
      });
    });
    group('4b. Invalid Signature', () {
      test('empty signature.signatureBytes throws', () {
        expect(
          () => _envelope(signature: _signedPayload([])),
          throwsA(isA<AssertionError>()),
        );
      });
    });

    group('5. Equality', () {
      test('two identical envelopes are equal', () {
        final a = _envelope();
        final b = _envelope();
        expect(a, equals(b));
        expect(a.hashCode, equals(b.hashCode));
      });
      test('different operationId => not equal', () {
        final a = _envelope(operationId: 'op-a');
        final b = _envelope(operationId: 'op-b');
        expect(a, isNot(equals(b)));
        expect(a.hashCode, isNot(equals(b.hashCode)));
      });
      test('different resourceId => not equal', () {
        final a = _envelope(resourceId: 'res-a');
        final b = _envelope(resourceId: 'res-b');
        expect(a, isNot(equals(b)));
      });
      test('different payload => not equal', () {
        final a = _envelope(payload: [1, 2]);
        final b = _envelope(payload: [1, 2, 3]);
        expect(a, isNot(equals(b)));
      });
      test('different signature bytes => not equal', () {
        final a = _envelope(signature: _signedPayload([10, 20]));
        final b = _envelope(signature: _signedPayload([10, 21]));
        expect(a, isNot(equals(b)));
      });
      test('different metadata attributes => not equal', () {
        final a = _envelope(metadata: _meta({'a': '1'}));
        final b = _envelope(metadata: _meta({'a': '2'}));
        expect(a, isNot(equals(b)));
      });
      test('same attributes different insertion order => equal (deterministic)', () {
        final a = _envelope(metadata: _meta({'a': '1', 'b': '2'}));
        final b = _envelope(metadata: _meta({'b': '2', 'a': '1'}));
        expect(a, equals(b));
        expect(a.hashCode, equals(b.hashCode));
      });
      test('identical is equal to self', () {
        final a = _envelope();
        expect(a, equals(a));
      });
      test('non OperationEnvelope is not equal', () {
        expect(_envelope(), isNot(equals('op-1')));
      });
    });

    group('6. Metadata Immutability', () {
      test('mutating original map after construction does not change envelope', () {
        final attrs = <String, String>{'k': 'v'};
        final envelope = _envelope(metadata: _meta(attrs));
        attrs['k'] = 'changed';
        attrs['x'] = 'y';
        expect(envelope.metadata.attributes['k'], 'v');
        expect(envelope.metadata.attributes.containsKey('x'), false);
      });
      test('returned attributes map is unmodifiable', () {
        final envelope = _envelope(metadata: _meta({'k': 'v'}));
        expect(
          () => envelope.metadata.attributes['x'] = 'y',
          throwsA(isA<UnsupportedError>()),
        );
        expect(
          () => envelope.metadata.attributes.clear(),
          throwsA(isA<UnsupportedError>()),
        );
      });
    });

    group('L1.1 — Payload defensive copy & hash stability', () {
      test('payload mutation after construction does not change envelope', () {
        final originalPayload = <int>[1, 2, 3];
        final envelope = OperationEnvelope(
          operationId: 'op-1',
          resourceId: 'res-1',
          payload: originalPayload,
          signature: _signedPayload([10, 20]),
          metadata: _meta({'k': 'v'}),
        );
        final initialHashCode = envelope.hashCode;
        originalPayload[0] = 99;
        expect(envelope.payload[0], 1);
        expect(envelope.hashCode, initialHashCode);
        final envelopeClone = OperationEnvelope(
          operationId: 'op-1',
          resourceId: 'res-1',
          payload: [1, 2, 3],
          signature: _signedPayload([10, 20]),
          metadata: _meta({'k': 'v'}),
        );
        expect(envelope, equals(envelopeClone));
      });
      test('returned payload is unmodifiable', () {
        final envelope = _envelope(payload: [1, 2, 3]);
        expect(
          () => envelope.payload.add(4),
          throwsA(isA<UnsupportedError>()),
        );
        expect(
          () => envelope.payload[0] = 99,
          throwsA(isA<UnsupportedError>()),
        );
      });
      test('hash stability: identical envelopes same hashCode', () {
        final a = _envelope(operationId: 'x', resourceId: 'y', payload: [1, 2]);
        final b = _envelope(operationId: 'x', resourceId: 'y', payload: [1, 2]);
        expect(a.hashCode, b.hashCode);
        expect(a, equals(b));
      });
      test('hash stability: different payload => different hashCode', () {
        final a = _envelope(payload: [1, 2]);
        final b = _envelope(payload: [1, 2, 3]);
        expect(a.hashCode, isNot(equals(b.hashCode)));
        expect(a, isNot(equals(b)));
      });
      test('hash stability: different metadata => different hashCode', () {
        final a = _envelope(metadata: _meta({'a': '1'}));
        final b = _envelope(metadata: _meta({'a': '2'}));
        expect(a.hashCode, isNot(equals(b.hashCode)));
        expect(a, isNot(equals(b)));
      });
    });

    group('L1.1 — Metadata defensive ordering', () {
      test('metadata with different key order yields equal envelope and same hashCode', () {
        final metadata1 = _meta({'b': '2', 'a': '1'});
        final metadata2 = _meta({'a': '1', 'b': '2'});
        final envelope1 = _envelope(metadata: metadata1);
        final envelope2 = _envelope(metadata: metadata2);
        expect(envelope1, equals(envelope2));
        expect(envelope1.hashCode, envelope2.hashCode);
      });
    });

    group('7. Determinism Guard', () {
      test('application model sources do not use DateTime, Random, or UUID', () async {
        final dir = Directory('lib/flow/application/model');
        expect(await dir.exists(), true, reason: 'model dir must exist');
        await for (final e in dir.list()) {
          if (e is File && e.path.endsWith('.dart')) {
            final content = await e.readAsString();
            expect(
              content.contains('DateTime'),
              false,
              reason: '${e.path} must not use DateTime',
            );
            expect(
              content.contains('Random'),
              false,
              reason: '${e.path} must not use Random',
            );
            expect(
              content.contains('Uuid'),
              false,
              reason: '${e.path} must not use Uuid',
            );
          }
        }
      });
    });
  });
}
