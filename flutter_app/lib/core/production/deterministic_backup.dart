// OX9 — Backup and restore with integrity hash.

abstract class DeterministicBackupProvider {
  Map<String, dynamic> createBackupPayload();
  bool restoreFromPayload(Map<String, dynamic> payload);
  String computeIntegrityHash(Map<String, dynamic> payload);
}

class DeterministicBackup {
  DeterministicBackup({required DeterministicBackupProvider provider})
      : _provider = provider;
  final DeterministicBackupProvider _provider;

  Map<String, dynamic> createBackup() {
    final payload = _provider.createBackupPayload();
    final hash = _provider.computeIntegrityHash(payload);
    final out = Map<String, dynamic>.from(payload);
    out['_integrityHash'] = hash;
    return out;
  }

  bool restoreBackup(Map<String, dynamic> payload) {
    final storedHash = payload['_integrityHash'] as String?;
    if (storedHash == null) return false;
    final payloadWithoutHash = Map<String, dynamic>.from(payload)..remove('_integrityHash');
    if (storedHash != _provider.computeIntegrityHash(payloadWithoutHash)) return false;
    return _provider.restoreFromPayload(payload);
  }

  bool verifyBackup(Map<String, dynamic> payload) {
    final storedHash = payload['_integrityHash'] as String?;
    if (storedHash == null) return false;
    final payloadWithoutHash = Map<String, dynamic>.from(payload)..remove('_integrityHash');
    return storedHash == _provider.computeIntegrityHash(payloadWithoutHash);
  }
}
