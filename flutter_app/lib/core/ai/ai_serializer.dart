// OX8 — Canonical serialization for AI input & output. Sorted keys; deterministic.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Canonical serialization for AI context and output. Same input → same hash across nodes.
class AISerializer {
  AISerializer._();

  /// Serializes [context] snapshot to canonical bytes (sorted keys, stable order).
  static List<int> serializeInput(Map<String, dynamic> context) {
    return CanonicalPayload.serialize(context);
  }

  /// Deterministic hash of context. Used as inputHash for suggestions.
  static String hashInput(Map<String, dynamic> context) {
    return CanonicalPayload.hash(context);
  }

  /// Serializes AI output to canonical form. No undefined; deterministic.
  static List<int> serializeOutput(Map<String, dynamic> output) {
    return CanonicalPayload.serialize(output);
  }

  /// Hash of output for envelope integrity.
  static String hashOutput(Map<String, dynamic> output) {
    return CanonicalPayload.hash(output);
  }
}
