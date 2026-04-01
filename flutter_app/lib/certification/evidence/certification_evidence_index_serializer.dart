// Phase 14.2 — Canonical serialization of certification evidence index. Deterministic; UTF-8.

import 'certification_evidence_index.dart';

/// Serializes the index to canonical JSON. Keys alphabetical; no extra whitespace.
String serializeCertificationEvidenceIndex(CertificationEvidenceIndex index) {
  final buffer = StringBuffer();
  buffer.write('{"entries":[');
  for (var i = 0; i < index.entries.length; i++) {
    if (i > 0) buffer.write(',');
    _entry(buffer, index.entries[i]);
  }
  buffer.write(']}');
  return buffer.toString();
}

void _entry(StringBuffer out, EvidenceEntry e) {
  out.write('{');
  _pair(out, 'description', e.description);
  out.write(',');
  _pair(out, 'id', e.id);
  out.write(',');
  _pair(out, 'sha256', e.sha256);
  out.write(',');
  _pair(out, 'source_phase', e.sourcePhase);
  out.write('}');
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
