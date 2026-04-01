// Media Execution — Port interface. Pure contract; no implementation.

import 'package:iris_flutter_app/media_materialization/physical_operation.dart';

import 'execution_result.dart';

/// Abstract port for executing physical media operations.
/// This is a pure contract following the Port & Adapter pattern.
/// No implementation logic; no provider references; no runtime dependencies.
abstract class MediaExecutionPort {
  /// Executes a single physical operation and returns the result.
  /// Implementations must:
  /// - Return ExecutionResult.success on successful completion
  /// - Return ExecutionResult.failed with appropriate failure on error
  /// - Return ExecutionResult.skipped if operation is not applicable
  /// - Never throw exceptions; always return a result
  Future<ExecutionResult> execute(PhysicalOperation operation);
}
