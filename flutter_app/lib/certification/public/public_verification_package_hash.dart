// Phase 14.4 — SHA-256 of public verification package. No salt; deterministic.
// Hash excludes PACKAGE_SHA256.txt so the result is the content of that file.

import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Canonical package hash: sort filenames, concatenate "<filename>\n<content>\n"
/// per file (excluding PACKAGE_SHA256.txt), then SHA-256 of UTF-8 bytes.
String computePublicVerificationPackageSha256(Map<String, String> files) {
  final keys = files.keys.where((k) => k != 'PACKAGE_SHA256.txt').toList()
    ..sort();
  final buffer = StringBuffer();
  for (final k in keys) {
    buffer.write(k);
    buffer.write('\n');
    buffer.write(files[k]!);
    buffer.write('\n');
  }
  final s = buffer.toString();
  final bytes = utf8.encode(s);
  final digest = sha256.convert(bytes);
  return digest.toString();
}
