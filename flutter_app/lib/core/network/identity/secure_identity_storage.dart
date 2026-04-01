/// O1 — Abstraction for secure persistence of identity (private key + public identity).
/// Implementations use OS keychain / secure storage; never log or expose private key.

/// Port for secure identity storage. Private key bytes must not be logged or exposed.
abstract interface class SecureIdentityStorage {
  Future<void> write(String key, List<int> bytes);
  Future<List<int>?> read(String key);
  Future<void> delete(String key);
}
