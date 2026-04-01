// Phase 14.3 — SHA-256 of canonical public certification manifest. No salt; deterministic.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'public_certification_manifest.dart';
import 'public_certification_manifest_serializer.dart';

/// SHA-256 of the canonical serialization of the manifest. Deterministic.
String computePublicCertificationManifestSha256(
    PublicCertificationManifest manifest) {
  final serialized = serializePublicCertificationManifest(manifest);
  final bytes = utf8.encode(serialized);
  final digest = sha256.convert(bytes);
  return digest.toString();
}
