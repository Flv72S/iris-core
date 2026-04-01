// J8 — Single record in a forensic package (immutable).

class ForensicRecord {
  const ForensicRecord({
    required this.recordType,
    required this.recordHash,
    required this.schemaVersion,
    required this.canonicalContent,
  });
  final String recordType;
  final String recordHash;
  final String schemaVersion;
  final String canonicalContent;
}
