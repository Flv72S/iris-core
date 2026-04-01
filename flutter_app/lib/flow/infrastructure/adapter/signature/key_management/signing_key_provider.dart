// K8 — Internal port for signing key provision. Key versioning and rotation.

/// A versioned signing key (HMAC key material).
class SigningKey {
  const SigningKey({
    required this.version,
    required this.keyBytes,
  });

  final int version;
  final List<int> keyBytes;
}

/// Provides active and versioned keys for deterministic signing.
/// Internal to key_management; does not replace SignaturePort.
abstract interface class SigningKeyProvider {
  /// Returns the currently active key (highest version).
  SigningKey getActiveKey();

  /// Returns the key for the given version, or null if unknown.
  /// Version 0 = legacy K7 key (for backward compatibility).
  SigningKey? getKeyByVersion(int version);
}
