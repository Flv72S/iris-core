// L3 — Application flow service. Builds envelope, serializes canonically, delegates to K.

import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical_serializer.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_request.dart';
import 'package:iris_flutter_app/flow/application/service/signed_operation_result.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_operation_context.dart';
import 'package:iris_flutter_app/flow/infrastructure/composition/infrastructure_orchestrator.dart';

/// App-level service: builds envelope from request, serializes to canonical form, delegates to orchestrator.
/// No signature validation, no storage/lock/retry handling.
class SignedOperationService {
  SignedOperationService({
    required this.orchestrator,
    required this.serializer,
  });

  final InfrastructureOrchestrator orchestrator;
  final OperationEnvelopeCanonicalSerializer serializer;

  /// Builds envelope from request, serializes to canonical bytes, invokes orchestrator, returns result.
  /// Orchestrator handles lock, retry, sign, store; exceptions propagate.
  Future<SignedOperationResult> execute(SignedOperationRequest request) async {
    final envelope = OperationEnvelope(
      operationId: request.operationId,
      resourceId: request.resourceId,
      payload: request.payload,
      signature: request.signature,
      metadata: request.metadata,
    );
    final canonical = serializer.serialize(envelope);
    final context = InfrastructureOperationContext(
      operationId: request.operationId,
      resourceId: request.resourceId,
    );
    await orchestrator.executeSignedStorageOperation(
      context: context,
      payloadProvider: () async => canonical.bytes.toList(),
    );
    return SignedOperationResult(envelope: envelope, persisted: true);
  }
}
