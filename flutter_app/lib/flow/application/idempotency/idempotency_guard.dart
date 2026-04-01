// L7 — Idempotency check and register. In-memory only; no persistence.

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_registry.dart';
import 'package:iris_flutter_app/flow/application/idempotency/idempotency_result.dart';

/// Checks if an execution contract was already applied; registers it if not.
class IdempotencyGuard {
  IdempotencyGuard({
    required this.registry,
  });

  final IdempotencyRegistry registry;

  /// If [contract]'s hash is already registered → alreadyExecuted true.
  /// Otherwise registers the hash and returns alreadyExecuted false.
  IdempotencyResult checkAndRegister(DeterministicExecutionContract contract) {
    final hash = contract.deterministicHash;
    if (registry.contains(hash)) {
      return const IdempotencyResult(alreadyExecuted: true);
    }
    registry.register(hash);
    return const IdempotencyResult(alreadyExecuted: false);
  }
}
