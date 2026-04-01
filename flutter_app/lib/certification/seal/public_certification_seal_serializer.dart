// Phase 14.9 — Canonical serialization of public certification seal. Deterministic; UTF-8.

import 'public_certification_seal.dart';

/// Serializes the seal to canonical JSON. Keys alphabetical; no extra whitespace.
String serializePublicCertificationSealCanonical(PublicCertificationSeal seal) {
  final buffer = StringBuffer();
  buffer.write('{');
  _pair(buffer, 'build_fingerprint', seal.buildFingerprint);
  buffer.write(',');
  _array(buffer, 'evidence_files', seal.evidenceFiles);
  buffer.write(',');
  _pair(buffer, 'freeze_seal_hash', seal.freezeSealHash);
  buffer.write(',');
  _pair(buffer, 'iris_core_version', seal.irisCoreVersion);
  buffer.write(',');
  _pair(buffer, 'reproducibility_proof_hash', seal.reproducibilityProofHash);
  buffer.write(',');
  _pair(buffer, 'structural_hash', seal.structuralHash);
  buffer.write(',');
  _pair(buffer, 'trust_disclosure_hash', seal.trustDisclosureHash);
  buffer.write('}');
  return buffer.toString();
}

void _array(StringBuffer out, String key, List<String> items) {
  _escape(out, key);
  out.write(':[');
  for (var i = 0; i < items.length; i++) {
    if (i > 0) out.write(',');
    _escape(out, items[i]);
  }
  out.write(']');
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
