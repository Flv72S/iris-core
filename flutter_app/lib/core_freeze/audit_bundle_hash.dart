// Phase 13.8 — SHA-256 hash of canonical bundle. Pure; no IO.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'audit_bundle_serializer.dart';
import 'external_audit_bundle.dart';

/// Computes SHA-256 of the canonical JSON serialization. Returns 64 lowercase hex chars.
String computeAuditBundleHash(ExternalAuditBundle bundle) {
  final canonical = serializeAuditBundleCanonically(bundle);
  final bytes = utf8.encode(canonical);
  final digest = sha256.convert(bytes);
  return digest.toString();
}
