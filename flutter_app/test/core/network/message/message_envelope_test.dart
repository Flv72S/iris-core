import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_signature.dart' as node_identity_signature;
import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_serializer.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_validator.dart';
import 'package:iris_flutter_app/core/network/message/message_types.dart';

Future<DeterministicMessageEnvelope> signEnvelope(
  DeterministicMessageEnvelope envelope,
  SimpleKeyPair keyPair,
) async {
  final bytes = MessageEnvelopeSerializer.toCanonicalBytesForSigning(envelope);
  final sig = await node_identity_signature.sign(Uint8List.fromList(bytes), keyPair);
  final sigB64 = base64Encode(sig.bytes);
  return DeterministicMessageEnvelope(
    messageId: envelope.messageId,
    senderNodeId: envelope.senderNodeId,
    protocolVersion: envelope.protocolVersion,
    payloadType: envelope.payloadType,
    payloadHash: envelope.payloadHash,
    payload: envelope.payload,
    signature: sigB64,
  );
}

void main() {
  final algorithm = Ed25519();

  group('MessageEnvelopeSerializer', () {
    test('Canonical serialization stability: same envelope produces identical bytes', () {
      const envelope = DeterministicMessageEnvelope(
        messageId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        senderNodeId: 'f0e1d2c3-b4a5-8697-7856-3412fedcba09',
        protocolVersion: '1.0',
        payloadType: MessageTypes.nodePing,
        payloadHash: '00000001',
        payload: '{}',
        signature: 'c2ln',
      );
      final a = MessageEnvelopeSerializer.toCanonicalBytes(envelope);
      final b = MessageEnvelopeSerializer.toCanonicalBytes(envelope);
      expect(a, b);
    });

    test('Payload hash correctness: hash of payload matches computePayloadHash', () {
      const payload = '{"key":"value"}';
      final hash = MessageEnvelopeSerializer.computePayloadHash(payload);
      expect(hash, isNotEmpty);
      expect(hash.toLowerCase(), hash);
      expect(RegExp(r'^[0-9a-f]+$').hasMatch(hash), isTrue);
      final again = MessageEnvelopeSerializer.computePayloadHash(payload);
      expect(again, hash);
    });
  });

  group('MessageEnvelopeValidator', () {
    test('Signature verification success: valid signed envelope validates', () async {
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      const payload = '{}';
      final payloadHash = MessageEnvelopeSerializer.computePayloadHash(payload);
      const messageId = '11111111-2222-4333-8444-555566667777';
      const senderNodeId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
      final draft = DeterministicMessageEnvelope(
        messageId: messageId,
        senderNodeId: senderNodeId,
        protocolVersion: DeterministicProtocolVersion.initial.toString(),
        payloadType: MessageTypes.nodePing,
        payloadHash: payloadHash,
        payload: payload,
        signature: '',
      );
      final signed = await signEnvelope(draft, keyPair);
      final result = await MessageEnvelopeValidator.validateEnvelope(
        signed,
        senderPublicKey: publicKeyB64,
      );
      expect(result.valid, isTrue);
      expect(result.error, isNull);
    });

    test('Signature verification failure: tampered payload fails', () async {
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      const payload = '{"a":1}';
      final payloadHash = MessageEnvelopeSerializer.computePayloadHash(payload);
      final draft = DeterministicMessageEnvelope(
        messageId: 'aaaaaaaa-bbbb-4ccc-8ddd-111111111111',
        senderNodeId: 'bbbbbbbb-cccc-4ddd-8eee-222222222222',
        protocolVersion: '1.0',
        payloadType: MessageTypes.syncStatus,
        payloadHash: payloadHash,
        payload: payload,
        signature: '',
      );
      final signed = await signEnvelope(draft, keyPair);
      final tampered = DeterministicMessageEnvelope(
        messageId: signed.messageId,
        senderNodeId: signed.senderNodeId,
        protocolVersion: signed.protocolVersion,
        payloadType: signed.payloadType,
        payloadHash: signed.payloadHash,
        payload: '{"a":2}',
        signature: signed.signature,
      );
      final result = await MessageEnvelopeValidator.validateEnvelope(
        tampered,
        senderPublicKey: publicKeyB64,
      );
      expect(result.valid, isFalse);
      expect(result.error, isNotNull);
    });

    test('Hash mismatch rejection: wrong payloadHash fails', () async {
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      const payload = '{}';
      final payloadHash = MessageEnvelopeSerializer.computePayloadHash(payload);
      final draft = DeterministicMessageEnvelope(
        messageId: 'cccccccc-dddd-4eee-8fff-333333333333',
        senderNodeId: 'dddddddd-eeee-4fff-8000-444444444444',
        protocolVersion: '1.0',
        payloadType: MessageTypes.nodePing,
        payloadHash: payloadHash,
        payload: payload,
        signature: '',
      );
      final signed = await signEnvelope(draft, keyPair);
      final wrongHash = DeterministicMessageEnvelope(
        messageId: signed.messageId,
        senderNodeId: signed.senderNodeId,
        protocolVersion: signed.protocolVersion,
        payloadType: signed.payloadType,
        payloadHash: 'deadbeef',
        payload: signed.payload,
        signature: signed.signature,
      );
      final result = await MessageEnvelopeValidator.validateEnvelope(
        wrongHash,
        senderPublicKey: publicKeyB64,
      );
      expect(result.valid, isFalse);
      expect(result.error?.contains('payloadHash') ?? false, isTrue);
    });

    test('Unknown payload type rejection', () async {
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      const payload = '{}';
      final payloadHash = MessageEnvelopeSerializer.computePayloadHash(payload);
      final draft = DeterministicMessageEnvelope(
        messageId: 'eeeeeeee-ffff-4000-8111-555555555555',
        senderNodeId: 'ffffffff-0000-4111-8222-666666666666',
        protocolVersion: '1.0',
        payloadType: 'UNKNOWN_TYPE',
        payloadHash: payloadHash,
        payload: payload,
        signature: '',
      );
      final signed = await signEnvelope(draft, keyPair);
      final result = await MessageEnvelopeValidator.validateEnvelope(
        signed,
        senderPublicKey: publicKeyB64,
      );
      expect(result.valid, isFalse);
      expect(result.error?.contains('payloadType') ?? false, isTrue);
    });

    test('Protocol version mismatch rejection', () async {
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final publicKeyB64 = base64Encode(publicKey.bytes);
      const payload = '{}';
      final payloadHash = MessageEnvelopeSerializer.computePayloadHash(payload);
      final draft = DeterministicMessageEnvelope(
        messageId: '00000000-1111-4222-8333-777777777777',
        senderNodeId: '11111111-2222-4333-8444-888888888888',
        protocolVersion: '2.0',
        payloadType: MessageTypes.nodePing,
        payloadHash: payloadHash,
        payload: payload,
        signature: '',
      );
      final signed = await signEnvelope(draft, keyPair);
      final result = await MessageEnvelopeValidator.validateEnvelope(
        signed,
        senderPublicKey: publicKeyB64,
        currentVersion: DeterministicProtocolVersion.initial,
      );
      expect(result.valid, isFalse);
      expect(result.error?.contains('protocolVersion') ?? false, isTrue);
    });
  });

  group('MessageTypes', () {
    test('All allowed types are recognized', () {
      for (final t in MessageTypes.all) {
        expect(MessageTypes.isAllowed(t), isTrue);
      }
      expect(MessageTypes.isAllowed('UNKNOWN'), isFalse);
    });
  });
}
