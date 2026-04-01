// Phase 14.1 — Canonical serialization of certification scope. Deterministic; UTF-8.

import 'core_certification_scope.dart';

/// Serializes the scope to canonical JSON. Keys alphabetical; no extra whitespace.
String serializeCoreCertificationScope(CoreCertificationScope scope) {
  final buffer = StringBuffer();
  buffer.write('{');
  _array(buffer, 'certified_artifacts', scope.certifiedArtifacts);
  buffer.write(',');
  _array(buffer, 'excluded_components', scope.excludedComponents);
  buffer.write(',');
  _array(buffer, 'verification_surface', scope.verificationSurface);
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
