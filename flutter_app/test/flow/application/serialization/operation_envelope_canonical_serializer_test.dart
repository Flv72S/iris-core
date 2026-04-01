import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_view.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';

SignedPayload _sig(List<int> b) => SignedPayload(
      signatureBytes: b,
      metadata: const SignatureMetadata(signerId: 's', algorithm: 'a'),
    );
OperationEnvelopeMetadata _meta(Map<String, String> m) =>
    OperationEnvelopeMetadata(attributes: m);

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
    signature: signature ?? _sig([10, 20]),
    metadata: metadata ?? _meta({'k': 'v'}),
  );
}

/// Test-only: parses canonical bytes back into an envelope for round-trip assertion. Not public API.
OperationEnvelope _parseCanonicalForTest(Uint8List bytes) {
  var i = 0;
  int readU32() {
    final v = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    i += 4;
    return v;
  }

  final opIdLen = readU32();
  final opId = utf8.decode(bytes.sublist(i, i + opIdLen));
  i += opIdLen;

  final resIdLen = readU32();
  final resId = utf8.decode(bytes.sublist(i, i + resIdLen));
  i += resIdLen;

  final payloadLen = readU32();
  final payload = List<int>.from(bytes.sublist(i, i + payloadLen));
  i += payloadLen;

  final sigLen = readU32();
  final sigBytes = List<int>.from(bytes.sublist(i, i + sigLen));
  i += sigLen;

  final attrCount = readU32();
  final attrs = <String, String>{};
  for (var n = 0; n < attrCount; n++) {
    final kLen = readU32();
    final k = utf8.decode(bytes.sublist(i, i + kLen));
    i += kLen;
    final vLen = readU32();
    final v = utf8.decode(bytes.sublist(i, i + vLen));
    i += vLen;
    attrs[k] = v;
  }

  return OperationEnvelope(
    operationId: opId,
    resourceId: resId,
    payload: payload,
    signature: _sig(sigBytes),
    metadata: _meta(attrs),
  );
}

void main() {
  late OperationEnvelopeCanonicalSerializer serializer;

  setUp(() {
    serializer = OperationEnvelopeCanonicalSerializer();
  });

  group('OperationEnvelopeCanonicalSerializer', () {
    group('1. Deterministic Serialization', () {
      test('two identical envelopes produce identical bytes', () {
        final a = _envelope();
        final b = _envelope();
        final canA = serializer.serialize(a);
        final canB = serializer.serialize(b);
        expect(canA.bytes.length, canB.bytes.length);
        for (var i = 0; i < canA.bytes.length; i++) {
          expect(canA.bytes[i], canB.bytes[i], reason: 'index $i');
        }
      });
    });

    group('2. Metadata Ordering Determinism', () {
      test('metadata in different key order produces identical bytes', () {
        final e1 = _envelope(metadata: _meta({'b': '2', 'a': '1'}));
        final e2 = _envelope(metadata: _meta({'a': '1', 'b': '2'}));
        final can1 = serializer.serialize(e1);
        final can2 = serializer.serialize(e2);
        expect(can1.bytes.length, can2.bytes.length);
        for (var i = 0; i < can1.bytes.length; i++) {
          expect(can1.bytes[i], can2.bytes[i], reason: 'index $i');
        }
      });
    });

    group('3. Payload Mutation Safety', () {
      test('mutating original payload after build does not change canonical bytes', () {
        final originalPayload = <int>[1, 2, 3];
        final envelope = OperationEnvelope(
          operationId: 'op',
          resourceId: 'res',
          payload: originalPayload,
          signature: _sig([5, 6]),
          metadata: _meta({'k': 'v'}),
        );
        final canonical = serializer.serialize(envelope);
        final bytesBefore = Uint8List.fromList(canonical.bytes);
        originalPayload[0] = 99;
        originalPayload.add(4);
        final canonicalAfter = serializer.serialize(envelope);
        expect(canonicalAfter.bytes.length, bytesBefore.length);
        for (var i = 0; i < bytesBefore.length; i++) {
          expect(canonicalAfter.bytes[i], bytesBefore[i], reason: 'index $i');
        }
      });
    });

    group('4. Canonical vs View Separation', () {
      test('view is not used by canonical serializer', () {
        final envelope = _envelope();
        final canonical = serializer.serialize(envelope);
        final view = toView(envelope);
        expect(view.operationId, envelope.operationId);
        expect(canonical.bytes.isNotEmpty, true);
      });
      test('canonical bytes unchanged after building view; view does not affect envelope', () {
        final envelope = _envelope(metadata: _meta({'a': '1'}));
        final canonical1 = serializer.serialize(envelope);
        final view = toView(envelope);
        expect(view.metadata['a'], '1');
        final canonical2 = serializer.serialize(envelope);
        expect(canonical1.bytes.length, canonical2.bytes.length);
        for (var i = 0; i < canonical1.bytes.length; i++) {
          expect(canonical2.bytes[i], canonical1.bytes[i], reason: 'index $i');
        }
      });
    });

    group('5. Byte Stability Test', () {
      test('serialize -> parse (test helper) -> serialize yields same bytes', () {
        final envelope = _envelope(
          operationId: 'oid',
          resourceId: 'rid',
          payload: [1, 2, 3, 4, 5],
          signature: _sig([10, 20, 30]),
          metadata: _meta({'x': 'y', 'a': 'b'}),
        );
        final can1 = serializer.serialize(envelope);
        final parsed = _parseCanonicalForTest(Uint8List.fromList(can1.bytes));
        final can2 = serializer.serialize(parsed);
        expect(can2.bytes.length, can1.bytes.length);
        for (var i = 0; i < can1.bytes.length; i++) {
          expect(can2.bytes[i], can1.bytes[i], reason: 'index $i');
        }
      });
      test('round-trip with non-ASCII UTF-8 in ids and metadata', () {
        final envelope = _envelope(
          operationId: 'op-\u00e9',
          resourceId: 'res-\u20ac',
          payload: [1],
          signature: _sig([5]),
          metadata: _meta({'k\u00e9y': 'v\u00e0l', 'a': 'b'}),
        );
        final can1 = serializer.serialize(envelope);
        final parsed = _parseCanonicalForTest(Uint8List.fromList(can1.bytes));
        final can2 = serializer.serialize(parsed);
        expect(parsed.operationId, 'op-\u00e9');
        expect(parsed.resourceId, 'res-\u20ac');
        expect(parsed.metadata.attributes['k\u00e9y'], 'v\u00e0l');
        expect(can2.bytes.length, can1.bytes.length);
        for (var i = 0; i < can1.bytes.length; i++) {
          expect(can2.bytes[i], can1.bytes[i], reason: 'index $i');
        }
      });
      test('round-trip with 4-byte UTF-8 character', () {
        final envelope = _envelope(
          operationId: 'op-\u{10000}',
          resourceId: 'res-1',
          payload: [1],
          signature: _sig([5]),
          metadata: _meta({'a': 'b'}),
        );
        final can1 = serializer.serialize(envelope);
        final parsed = _parseCanonicalForTest(Uint8List.fromList(can1.bytes));
        expect(parsed.operationId, 'op-\u{10000}');
        final can2 = serializer.serialize(parsed);
        expect(can2.bytes.length, can1.bytes.length);
        for (var i = 0; i < can1.bytes.length; i++) {
          expect(can2.bytes[i], can1.bytes[i], reason: 'index $i');
        }
      });
    });

    group('6. Determinism Guard', () {
      test('canonical serializer source does not use DateTime, Random, UUID, jsonEncode', () async {
        final dir = Directory('lib/flow/application/serialization');
        expect(await dir.exists(), true);
        await for (final e in dir.list()) {
          if (e is File && e.path.replaceAll(r'\', '/').endsWith('operation_envelope_canonical_serializer.dart')) {
            final content = await e.readAsString();
            expect(content.contains('DateTime'), false, reason: 'must not use DateTime');
            expect(content.contains('Random'), false, reason: 'must not use Random');
            expect(content.contains('Uuid'), false, reason: 'must not use Uuid');
            expect(content.contains('jsonEncode'), false, reason: 'must not use jsonEncode');
            return;
          }
        }
        fail('serializer file not found');
      });
    });
  });

  group('OperationEnvelopeCanonical', () {
    test('empty bytes throws', () {
      expect(
        () => OperationEnvelopeCanonical([]),
        throwsA(isA<AssertionError>()),
      );
    });
    test('bytes are unmodifiable', () {
      final raw = Uint8List.fromList([1, 2, 3]);
      final can = OperationEnvelopeCanonical(raw);
        raw[0] = 99;
      expect(can.bytes[0], 1);
      expect(
        () => can.bytes[0] = 99,
        throwsA(isA<UnsupportedError>()),
      );
    });
  });

  group('OperationEnvelopeView / toView', () {
    test('toView returns correct fields', () {
      final envelope = _envelope(
        operationId: 'op',
        resourceId: 'res',
        payload: [1, 2],
        signature: _sig([10, 20]),
        metadata: _meta({'k': 'v'}),
      );
      final view = toView(envelope);
      expect(view.operationId, 'op');
      expect(view.resourceId, 'res');
      expect(view.payload, [1, 2]);
      expect(view.metadata, {'k': 'v'});
      expect(view.signatureBase64, base64Encode([10, 20]));
    });
  });
}
