// Phase 14.8 — Canonical serialization of external audit proof. Deterministic; UTF-8.

import 'external_audit_proof.dart';

/// Serializes the proof to canonical JSON. Keys alphabetical; no extra whitespace.
String serializeExternalAuditProofCanonical(
    ExternalAuditReproducibilityProof proof) {
  final buffer = StringBuffer();
  buffer.write('{');
  _pair(buffer, 'auditor_environment_hash', proof.auditorEnvironmentHash);
  buffer.write(',');
  _pair(buffer, 'build_fingerprint', proof.buildFingerprint);
  buffer.write(',');
  _pair(buffer, 'freeze_seal_hash', proof.freezeSealHash);
  buffer.write(',');
  buffer.write('"hashes_match":');
  buffer.write(proof.hashesMatch ? 'true' : 'false');
  buffer.write(',');
  _pair(buffer, 'iris_core_version', proof.irisCoreVersion);
  buffer.write(',');
  _pair(buffer, 'reproduced_at_utc', proof.reproducedAtUtc);
  buffer.write(',');
  _pair(buffer, 'structural_hash', proof.structuralHash);
  buffer.write('}');
  return buffer.toString();
}

void _pair(StringBuffer out, String key, String value) {
  _escape(out, key);
  out.write(':');
  _escape(out, value);
}

void _escape(StringBuffer out, String s) {
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
