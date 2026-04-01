// L5 — Result of retrieval + verification. Immutable; no logic.

import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';

/// Result of retrieving and verifying a persisted operation.
class RetrievedOperationResult {
  const RetrievedOperationResult({
    required this.envelope,
    required this.signatureValid,
  });

  final OperationEnvelope envelope;
  final bool signatureValid;
}
