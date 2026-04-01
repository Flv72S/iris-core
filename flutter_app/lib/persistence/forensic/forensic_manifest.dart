// J8 — Immutable manifest of a forensic package.

class ForensicManifest {
  const ForensicManifest({
    required this.executionId,
    required this.totalRecords,
    required this.recordHashes,
    required this.integrityStatus,
    required this.replayStatus,
    required this.manifestHash,
  });
  final String executionId;
  final int totalRecords;
  final List<String> recordHashes;
  final bool integrityStatus;
  final bool replayStatus;
  final String manifestHash;
}
