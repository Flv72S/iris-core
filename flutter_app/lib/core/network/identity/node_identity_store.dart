/// O1 — Load or generate node identity; persist private key securely; expose public identity only.

import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:uuid/uuid.dart';

import 'package:iris_flutter_app/core/network/identity/deterministic_node_identity.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_serializer.dart';
import 'package:iris_flutter_app/core/network/identity/node_identity_signature.dart' as node_sig;
import 'package:iris_flutter_app/core/network/identity/secure_identity_storage.dart';

const String _keySeed = 'iris.node_identity.seed';
const String _keyPublic = 'iris.node_identity.public';

final Ed25519 _ed25519 = Ed25519();
const Uuid _uuid = Uuid();

/// Loads identity from [storage], or generates and persists one if absent.
/// Private key is never exported; use [sign] to sign messages.
class NodeIdentityStore {
  NodeIdentityStore(this._storage);

  final SecureIdentityStorage _storage;
  DeterministicNodeIdentity? _cachedIdentity;
  SimpleKeyPair? _cachedKeyPair;

  /// Returns the public node identity. Generates and persists one if not present.
  Future<DeterministicNodeIdentity> getNodeIdentity() async {
    if (_cachedIdentity != null) return _cachedIdentity!;
    final publicBytes = await _storage.read(_keyPublic);
    if (publicBytes != null && publicBytes.isNotEmpty) {
      _cachedIdentity = NodeIdentitySerializer.fromCanonicalBytes(publicBytes);
      final seed = await _storage.read(_keySeed);
      if (seed != null && seed.length >= 32) {
        _cachedKeyPair = await _ed25519.newKeyPairFromSeed(seed);
      }
      return _cachedIdentity!;
    }
    final keyPair = await _ed25519.newKeyPair();
    final seed = await keyPair.extractPrivateKeyBytes();
    if (seed.length < 32) throw StateError('Ed25519 seed expected 32 bytes');
    await _storage.write(_keySeed, seed);
    final publicKey = await keyPair.extractPublicKey();
    final publicKeyB64 = base64Encode(publicKey.bytes);
    final nodeId = _uuid.v4();
    final createdAt = DateTime.now().toUtc().toIso8601String();
    final protocolVersion = defaultNodeIdentityProtocolVersion;
    final identity = DeterministicNodeIdentity(
      nodeId: nodeId,
      publicKey: publicKeyB64,
      protocolVersion: protocolVersion,
      createdAt: createdAt,
    );
    final canonicalBytes = NodeIdentitySerializer.toCanonicalBytes(identity);
    await _storage.write(_keyPublic, canonicalBytes);
    _cachedIdentity = identity;
    _cachedKeyPair = keyPair;
    return identity;
  }

  /// Signs [message] with the stored private key. Private key never leaves the store.
  Future<node_sig.NodeSignature> sign(List<int> message) async {
    final keyPair = _cachedKeyPair ?? await _loadKeyPair();
    return node_sig.sign(Uint8List.fromList(message), keyPair);
  }

  Future<SimpleKeyPair> _loadKeyPair() async {
    if (_cachedKeyPair != null) return _cachedKeyPair!;
    await getNodeIdentity();
    final seed = await _storage.read(_keySeed);
    if (seed == null || seed.length < 32) throw StateError('No identity seed in storage');
    _cachedKeyPair = await _ed25519.newKeyPairFromSeed(seed);
    return _cachedKeyPair!;
  }
}
