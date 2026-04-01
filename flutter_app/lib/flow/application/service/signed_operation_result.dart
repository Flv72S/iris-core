// L3 — Result of execute. Envelope + persisted flag; no interpretation of infra result.

import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';

/// Result of a signed operation execution. persisted reflects orchestrator completion only.
class SignedOperationResult {
  const SignedOperationResult({
    required this.envelope,
    required this.persisted,
  });

  final OperationEnvelope envelope;
  final bool persisted;
}
