// L4 — Pre-execution validation. Structural and syntactic only; no crypto, no infra.

import 'package:iris_flutter_app/flow/application/service/signed_operation_request.dart';
import 'package:iris_flutter_app/flow/application/validation/validation_error.dart';
import 'package:iris_flutter_app/flow/application/validation/validation_result.dart';

/// Validates [SignedOperationRequest] before execution. Deterministic; no side effects.
/// Does not validate cryptographic signature; does not access infrastructure.
class SignedOperationValidator {
  /// Validates in fixed order: operationId, resourceId, payload, signature, metadata.
  /// Returns errors in deterministic order; does not throw.
  ValidationResult validate(SignedOperationRequest request) {
    final errors = <ValidationError>[];

    if (request.operationId.trim().isEmpty) {
      errors.add(const ValidationError(
        code: 'operation_id_empty',
        message: 'operationId must be non-empty and not only whitespace',
      ));
    }

    if (request.resourceId.trim().isEmpty) {
      errors.add(const ValidationError(
        code: 'resource_id_empty',
        message: 'resourceId must be non-empty and not only whitespace',
      ));
    }

    if (request.payload.isEmpty) {
      errors.add(const ValidationError(
        code: 'payload_empty',
        message: 'payload must be non-empty',
      ));
    }

    if (request.signature.signatureBytes.isEmpty) {
      errors.add(const ValidationError(
        code: 'signature_empty',
        message: 'signature.signatureBytes must be non-empty',
      ));
    }

    if (request.signature.metadata.algorithm.trim().isEmpty) {
      errors.add(const ValidationError(
        code: 'signature_algorithm_empty',
        message: 'signature.metadata.algorithm must be non-empty',
      ));
    }

    for (final key in request.metadata.attributes.keys) {
      if (key.trim().isEmpty) {
        errors.add(const ValidationError(
          code: 'metadata_key_empty',
          message: 'metadata must not contain empty or whitespace-only keys',
        ));
        break;
      }
    }

    if (errors.isEmpty) {
      return ValidationResult.valid();
    }
    return ValidationResult.invalid(errors);
  }
}
