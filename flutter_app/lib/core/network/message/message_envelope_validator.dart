/// O2 — Deterministic envelope validation. Reject on first failure.

import 'dart:convert';
import 'dart:convert';
import 'dart:typed_data';

import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_signature.dart';
import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_serializer.dart';
import 'package:iris_flutter_app/core/network/message/message_types.dart';

/// Result of envelope validation. [valid] true iff all checks passed.
class ValidationResult {
  const ValidationResult({required this.valid, this.error});
  final bool valid;
  final String? error;

  static const ValidationResult ok = ValidationResult(valid: true);
  static ValidationResult fail(String message) =>
      ValidationResult(valid: false, error: message);
}

/// UUID v4 pattern (simple: 8-4-4-4-12 hex with hyphens).
final RegExp _uuidV4Pattern = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

class MessageEnvelopeValidator {
  MessageEnvelopeValidator._();

  /// [senderPublicKey] is base64-encoded Ed25519 public key for signature verification.
  /// [currentVersion] is the acceptable deterministic protocol version (e.g. initial).
  static Future<ValidationResult> validateEnvelope(
    DeterministicMessageEnvelope envelope, {
    required String senderPublicKey,
    DeterministicProtocolVersion currentVersion = DeterministicProtocolVersion.initial,
  }) async {
    if (envelope.messageId.isEmpty) return ValidationResult.fail('messageId required');
    if (envelope.senderNodeId.isEmpty) return ValidationResult.fail('senderNodeId required');
    if (envelope.protocolVersion.isEmpty) return ValidationResult.fail('protocolVersion required');
    if (envelope.payloadType.isEmpty) return ValidationResult.fail('payloadType required');
    if (envelope.payloadHash.isEmpty) return ValidationResult.fail('payloadHash required');
    if (envelope.signature.isEmpty) return ValidationResult.fail('signature required');

    if (!_uuidV4Pattern.hasMatch(envelope.messageId)) {
      return ValidationResult.fail('messageId must be UUID v4 format');
    }

    final versionOk = _parseAndCheckVersion(envelope.protocolVersion, currentVersion);
    if (!versionOk) {
      return ValidationResult.fail('protocolVersion incompatible');
    }

    final recomputedHash = MessageEnvelopeSerializer.computePayloadHash(envelope.payload);
    if (recomputedHash != envelope.payloadHash) {
      return ValidationResult.fail('payloadHash mismatch');
    }

    if (!MessageTypes.isAllowed(envelope.payloadType)) {
      return ValidationResult.fail('unknown payloadType: ${envelope.payloadType}');
    }

    List<int> sigBytes;
    try {
      sigBytes = base64.decode(envelope.signature);
    } catch (_) {
      return ValidationResult.fail('signature not valid base64');
    }
    final signature = NodeSignature(Uint8List.fromList(sigBytes));
    final bytesToVerify = MessageEnvelopeSerializer.toCanonicalBytesForSigning(envelope);
    final verified = await verify(
      Uint8List.fromList(bytesToVerify),
      signature,
      senderPublicKey,
    );
    if (!verified) return ValidationResult.fail('signature invalid');

    return ValidationResult.ok;
  }

  static bool _parseAndCheckVersion(String versionStr, DeterministicProtocolVersion current) {
    final parts = versionStr.split('.');
    if (parts.length != 2) return false;
    final major = int.tryParse(parts[0]);
    final minor = int.tryParse(parts[1]);
    if (major == null || minor == null) return false;
    final envelopeVersion = DeterministicProtocolVersion(major: major, minor: minor);
    return current.major == envelopeVersion.major &&
        envelopeVersion.minor <= current.minor;
  }
}
