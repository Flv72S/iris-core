// KX — Composition-layer exceptions. Wraps port exceptions when needed.

import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

/// Thrown when the infrastructure orchestrator fails (e.g. after lock release).
class InfrastructureCompositionException extends InfrastructureException {
  InfrastructureCompositionException([super.message, super.cause]);
}
