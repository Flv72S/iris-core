// Phase 14.3 — Canonical serialization of public certification manifest. Deterministic; UTF-8.

import 'public_certification_manifest.dart';

/// Serializes the manifest to canonical JSON. Keys alphabetical; no extra whitespace.
String serializePublicCertificationManifest(
    PublicCertificationManifest manifest) {
  final buffer = StringBuffer();
  buffer.write('{');
  _pair(buffer, 'certification_scope_hash', manifest.certificationScopeHash);
  buffer.write(',');
  _pair(buffer, 'core_structural_hash', manifest.coreStructuralHash);
  buffer.write(',');
  _array(buffer, 'evidence_entry_ids', manifest.evidenceEntryIds);
  buffer.write(',');
  _pair(buffer, 'evidence_index_hash', manifest.evidenceIndexHash);
  buffer.write(',');
  _pair(buffer, 'generated_by', manifest.generatedBy);
  buffer.write(',');
  _pair(buffer, 'manifest_version', manifest.manifestVersion);
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
