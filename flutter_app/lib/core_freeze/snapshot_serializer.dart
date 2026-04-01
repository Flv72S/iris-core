// Phase 13.9 — Canonical serialization of certification snapshot. Deterministic; UTF-8.

import 'formal_core_snapshot.dart';

/// Serializes the snapshot to canonical JSON. Keys alphabetical; no extra whitespace.
String serializeSnapshotCanonically(FormalCoreCertificationSnapshot snapshot) {
  final buffer = StringBuffer();
  buffer.write('{');
  _key(buffer, 'audit_bundle_hash');
  buffer.write(':');
  _key(buffer, snapshot.auditBundleHash);
  buffer.write(',');
  _key(buffer, 'binary_provenance_hash');
  buffer.write(':');
  _key(buffer, snapshot.binaryProvenanceHash);
  buffer.write(',');
  _key(buffer, 'build_fingerprint_hash');
  buffer.write(':');
  _key(buffer, snapshot.buildFingerprintHash);
  buffer.write(',');
  _key(buffer, 'freeze_seal_hash');
  buffer.write(':');
  _key(buffer, snapshot.freezeSealHash);
  buffer.write(',');
  _key(buffer, 'freeze_version');
  buffer.write(':');
  _key(buffer, snapshot.freezeVersion);
  buffer.write(',');
  _key(buffer, 'structural_hash');
  buffer.write(':');
  _key(buffer, snapshot.structuralHash);
  buffer.write('}');
  return buffer.toString();
}

void _key(StringBuffer out, String s) {
  out.write('"');
  for (var i = 0; i < s.length; i++) {
    final c = s[i];
    switch (c) {
      case '\\':
        out.write(r'\\');
        break;
      case '"':
        out.write(r'\"');
        break;
      case '\n':
        out.write(r'\n');
        break;
      case '\r':
        out.write(r'\r');
        break;
      case '\t':
        out.write(r'\t');
        break;
      default:
        if (c.codeUnitAt(0) < 32) {
          out.write('\\u');
          out.write(c.codeUnitAt(0).toRadixString(16).padLeft(4, '0'));
        } else {
          out.write(c);
        }
    }
  }
  out.write('"');
}
