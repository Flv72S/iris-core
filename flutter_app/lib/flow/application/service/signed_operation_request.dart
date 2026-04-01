// L3 — Request model for signed operation. Immutable; no validation, no ID generation.

import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/signature/signed_payload.dart';

/// Immutable request for a signed operation. All fields supplied by caller.
class SignedOperationRequest {
  const SignedOperationRequest({
    required this.operationId,
    required this.resourceId,
    required this.payload,
    required this.signature,
    required this.metadata,
  });

  final String operationId;
  final String resourceId;
  final List<int> payload;
  final SignedPayload signature;
  final OperationEnvelopeMetadata metadata;
}
