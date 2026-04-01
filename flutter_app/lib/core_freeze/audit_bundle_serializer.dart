// Phase 13.8 — Canonical serialization of audit bundle. Deterministic; UTF-8; no extra whitespace.

import 'external_audit_bundle.dart';

/// Serializes the bundle to canonical JSON. Keys alphabetical; single trailing newline.
String serializeAuditBundleCanonically(ExternalAuditBundle bundle) {
  final map = bundle.toJson();
  final buffer = StringBuffer();
  _writeJsonValue(buffer, map);
  buffer.write('\n');
  return buffer.toString();
}

/// Serializes a map to canonical JSON (keys sorted). No trailing newline. For hashing nested structures.
String serializeMapCanonically(Map<String, Object> map) {
  final buffer = StringBuffer();
  _writeJsonValue(buffer, map);
  return buffer.toString();
}

void _writeJsonValue(StringBuffer out, Object? value) {
  if (value == null) {
    out.write('null');
    return;
  }
  if (value is String) {
    _escape(out, value);
    return;
  }
  if (value is bool) {
    out.write(value ? 'true' : 'false');
    return;
  }
  if (value is int || value is double) {
    out.write(value.toString());
    return;
  }
  if (value is List<Object?>) {
    out.write('[');
    for (var i = 0; i < value.length; i++) {
      if (i > 0) out.write(',');
      _writeJsonValue(out, value[i]);
    }
    out.write(']');
    return;
  }
  if (value is Map<String, Object>) {
    final keys = value.keys.toList()..sort();
    out.write('{');
    for (var i = 0; i < keys.length; i++) {
      if (i > 0) out.write(',');
      _escape(out, keys[i]);
      out.write(':');
      _writeJsonValue(out, value[keys[i]]);
    }
    out.write('}');
    return;
  }
  if (value is List<String>) {
    out.write('[');
    for (var i = 0; i < value.length; i++) {
      if (i > 0) out.write(',');
      _escape(out, value[i]);
    }
    out.write(']');
    return;
  }
  if (value is Map<Object?, Object?>) {
    final keys = value.keys.whereType<String>().toList()..sort();
    out.write('{');
    for (var i = 0; i < keys.length; i++) {
      if (i > 0) out.write(',');
      _escape(out, keys[i]);
      out.write(':');
      _writeJsonValue(out, value[keys[i]]);
    }
    out.write('}');
    return;
  }
  out.write('null');
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
