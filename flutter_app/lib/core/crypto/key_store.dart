// OX7 — Local key management. Private key never leaves device; deterministic from seed.

import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// Result of generating a key pair. Store [seed] via [KeyStore.storeKey]; expose [publicKeyBase64].
class KeyPairResult {
  const KeyPairResult({
    required this.publicKeyBase64,
    required this.seed,
  });
  final String publicKeyBase64;
  final List<int> seed;
}

/// Local key management. Key generation allowed once per identity; derivation deterministic from seed.
/// Private key never leaves device (stored as seed; keyPair derived on demand).
abstract class KeyStore {
  /// Generates a new Ed25519 key pair. Call once per identity; then [storeKey] the returned seed.
  Future<KeyPairResult> generateKeyPair();

  /// Stores key material for [identityId]. [seed] must be 32 bytes (from [KeyPairResult.seed] or deterministic derivation).
  Future<void> storeKey(String identityId, List<int> seed);

  /// Returns the key pair for [identityId], or null if not stored. Derived deterministically from stored seed.
  Future<SimpleKeyPair?> getKeyPair(String identityId);

  /// Returns public key bytes (32) for [identityId], or null.
  Future<Uint8List?> getPublicKeyBytes(String identityId);

  /// Returns base64-encoded public key for [identityId], or null.
  Future<String?> getPublicKeyBase64(String identityId);
}

final Ed25519 _ed25519 = Ed25519();

/// In-memory key store for tests. Not secure; do not use in production.
class InMemoryKeyStore implements KeyStore {
  final Map<String, List<int>> _seeds = {};

  @override
  Future<KeyPairResult> generateKeyPair() async {
    final keyPair = await _ed25519.newKeyPair();
    final seed = await keyPair.extractPrivateKeyBytes();
    if (seed.length < 32) throw StateError('Ed25519 seed expected 32 bytes');
    final seedList = seed is Uint8List ? seed.toList() : List<int>.from(seed);
    final publicKey = await keyPair.extractPublicKey();
    final publicKeyBase64 = base64Encode(publicKey.bytes);
    return KeyPairResult(publicKeyBase64: publicKeyBase64, seed: seedList);
  }

  @override
  Future<void> storeKey(String identityId, List<int> seed) async {
    if (seed.length < 32) throw ArgumentError('Seed must be at least 32 bytes');
    _seeds[identityId] = List<int>.from(seed);
  }

  @override
  Future<SimpleKeyPair?> getKeyPair(String identityId) async {
    final seed = _seeds[identityId];
    if (seed == null || seed.length < 32) return null;
    return _ed25519.newKeyPairFromSeed(Uint8List.fromList(seed));
  }

  @override
  Future<Uint8List?> getPublicKeyBytes(String identityId) async {
    final kp = await getKeyPair(identityId);
    if (kp == null) return null;
    final pk = await kp.extractPublicKey();
    return Uint8List.fromList(pk.bytes);
  }

  @override
  Future<String?> getPublicKeyBase64(String identityId) async {
    final bytes = await getPublicKeyBytes(identityId);
    return bytes != null ? base64Encode(bytes) : null;
  }
}
