// K7 — Signature port. Contract only; no implementation.

import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_verification_result.dart';

/// Port for deterministic signing and verification of payloads.
abstract interface class SignaturePort {
  /// Signs [payload] with [metadata]. Returns [SignedPayload].
  SignedPayload sign({
    required List<int> payload,
    required SignatureMetadata metadata,
  });

  /// Verifies [payload] against [signature]. Returns [SignatureVerificationResult].
  SignatureVerificationResult verify({
    required List<int> payload,
    required SignedPayload signature,
  });
}
