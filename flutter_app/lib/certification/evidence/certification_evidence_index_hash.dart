// Phase 14.2 — SHA-256 of canonical evidence index. No salt; deterministic.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'certification_evidence_index.dart';
import 'certification_evidence_index_serializer.dart';

/// SHA-256 of the canonical serialization of the index. Deterministic.
String computeCertificationEvidenceIndexSha256(CertificationEvidenceIndex index) {
  final serialized = serializeCertificationEvidenceIndex(index);
  final bytes = utf8.encode(serialized);
  final digest = sha256.convert(bytes);
  return digest.toString();
}
