// Phase 13.9 — SHA-256 of certification snapshot. CORE_CERTIFICATION_HASH_V1.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'formal_core_snapshot.dart';
import 'snapshot_serializer.dart';

/// Identifier for the Phase 13 certification hash (result of [computeFormalCoreSnapshotHash]).
const String kCoreCertificationHashV1Id = 'CORE_CERTIFICATION_HASH_V1';

/// Computes the definitive Phase 13 closure hash. 64 lowercase hex chars.
/// This is [kCoreCertificationHashV1Id].
String computeFormalCoreSnapshotHash(FormalCoreCertificationSnapshot snapshot) {
  final canonical = serializeSnapshotCanonically(snapshot);
  final bytes = utf8.encode(canonical);
  final digest = sha256.convert(bytes);
  return digest.toString();
}
