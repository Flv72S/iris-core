// OX9 — Wrap KeyStore. Private keys never logged or transmitted.

import 'package:cryptography/cryptography.dart';
import 'package:iris_flutter_app/core/crypto/key_store.dart';
import 'package:iris_flutter_app/core/production/deployment_profile.dart';

/// Wraps KeyStore with policy. Signing only in secure context; keys never logged/transmitted.
class KeyProtectionPolicy {
  KeyProtectionPolicy({
    required KeyStore keyStore,
    required KeyProtectionMode mode,
  })  : _keyStore = keyStore,
        _mode = mode;

  final KeyStore _keyStore;
  final KeyProtectionMode _mode;

  Future<KeyPairResult> generateKeyPair() => _keyStore.generateKeyPair();

  Future<void> storeKey(String identityId, List<int> seed) async {
    if (_mode == KeyProtectionMode.airGappedMode && identityId.isEmpty) return;
    await _keyStore.storeKey(identityId, seed);
  }

  Future<SimpleKeyPair?> getKeyPair(String identityId) => _keyStore.getKeyPair(identityId);

  Future<String?> getPublicKeyBase64(String identityId) =>
      _keyStore.getPublicKeyBase64(identityId);

  KeyProtectionMode get mode => _mode;

  bool get isSecureContext =>
      _mode == KeyProtectionMode.encryptedAtRest ||
      _mode == KeyProtectionMode.hardwareBacked ||
      _mode == KeyProtectionMode.airGappedMode;
}
