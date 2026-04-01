// K7 — Signed payload. No implementation; value type only.

import 'package:iris_flutter_app/flow/infrastructure/port/signature/signature_metadata.dart';

/// Payload with attached signature and metadata.
class SignedPayload {
  const SignedPayload({
    required this.signatureBytes,
    required this.metadata,
  });

  final List<int> signatureBytes;
  final SignatureMetadata metadata;
}
