/// O1 — Ed25519 sign/verify for node identity. Deterministic for same key + message.

import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// Result of signing a message. Bytes only; no private key.
class NodeSignature {
  const NodeSignature(this.bytes);
  final Uint8List bytes;
}

final Ed25519 _ed25519 = Ed25519();

/// Signs [message] with [keyPair]. Same key + message → same signature (deterministic).
Future<NodeSignature> sign(Uint8List message, SimpleKeyPair keyPair) async {
  final signature = await _ed25519.sign(
    message,
    keyPair: keyPair,
  );
  return NodeSignature(Uint8List.fromList(signature.bytes));
}

/// Verifies [message] with [signature] and [publicKey].
/// [publicKey] is base64-encoded Ed25519 public key (32 bytes).
/// Pure: no mutation; deterministic for same inputs.
Future<bool> verify(
  Uint8List message,
  NodeSignature signature,
  String publicKey,
) async {
  final publicKeyBytes = base64.decode(publicKey);
  if (publicKeyBytes.length != 32) return false;
  final pk = SimplePublicKey(
    publicKeyBytes,
    type: _ed25519.keyPairType,
  );
  final sig = Signature(
    signature.bytes,
    publicKey: pk,
  );
  return _ed25519.verify(
    message,
    signature: sig,
  );
}
