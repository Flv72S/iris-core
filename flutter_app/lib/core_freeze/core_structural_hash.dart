// Phase 13.3 — Structural hash SHA-256. Pure function; no IO, no runtime deps.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'core_surface_manifest.dart';
import 'deterministic_core_serializer.dart';

/// Computes SHA-256 of the canonical JSON representation. Returns 64 lowercase hex chars.
String computeCoreStructuralHash(CoreSurfaceManifest manifest) {
  final canonical = serializeCoreCanonically(manifest);
  final bytes = utf8.encode(canonical);
  final digest = sha256.convert(bytes);
  return digest.toString();
}

/// Returns true iff two hash computations on the same manifest produce identical results.
bool isStructuralHashStable(CoreSurfaceManifest manifest) {
  final a = computeCoreStructuralHash(manifest);
  final b = computeCoreStructuralHash(manifest);
  return a == b;
}

/// Returns true iff [hash] is a valid structural hash: 64 chars, [0-9a-f] only, no whitespace.
bool isValidStructuralHash(String hash) {
  if (hash.length != 64) return false;
  for (var i = 0; i < hash.length; i++) {
    final c = hash[i];
    if (c == ' ' || c == '\t' || c == '\n' || c == '\r') return false;
    if (c != '0' &&
        c != '1' &&
        c != '2' &&
        c != '3' &&
        c != '4' &&
        c != '5' &&
        c != '6' &&
        c != '7' &&
        c != '8' &&
        c != '9' &&
        c != 'a' &&
        c != 'b' &&
        c != 'c' &&
        c != 'd' &&
        c != 'e' &&
        c != 'f') return false;
  }
  return true;
}
