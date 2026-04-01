/// O8 — Backend for fork resolution: validate and apply branch. Enables atomic rollback.

import 'package:iris_flutter_app/core/network/fork/fork_analysis.dart';
import 'package:iris_flutter_app/core/network/fork/fork_branch.dart';

/// Backend used by [ForkResolutionEngine] to validate and apply branches.
/// Implementations must use transactional isolation and restore state on failure.
abstract interface class ForkResolutionBackend {
  /// Validate remote branch via full replay from ancestor and apply atomically if hash matches.
  /// Returns true if applied; false if validation failed (state unchanged).
  bool validateAndApplyRemoteBranch({
    required int commonAncestorHeight,
    required ForkBranch remoteBranch,
  });

  /// Verify local ledger chain integrity (e.g. verifyFullChain).
  bool verifyLocalChain();
}
