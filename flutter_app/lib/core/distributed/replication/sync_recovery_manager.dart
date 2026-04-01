// ODA-2 — Recover from crash during replication. Deterministic.

class SyncRecoveryResult {
  const SyncRecoveryResult({
    required this.recovered,
    required this.lastValidIndex,
    required this.rollbackCount,
  });
  final bool recovered;
  final int lastValidIndex;
  final int rollbackCount;
}

class SyncRecoveryManager {
  SyncRecoveryManager({
    required this.detectPartialApplication,
    required this.rollbackIncompleteBatch,
    required this.revalidateHashChain,
  });

  final bool Function() detectPartialApplication;
  final int Function() rollbackIncompleteBatch;
  final bool Function(int fromIndex) revalidateHashChain;

  SyncRecoveryResult recoverIncompleteSync() {
    if (!detectPartialApplication()) {
      return const SyncRecoveryResult(recovered: true, lastValidIndex: 0, rollbackCount: 0);
    }
    final rollbackCount = rollbackIncompleteBatch();
    final lastValid = rollbackCount > 0 ? 0 : 0;
    final ok = revalidateHashChain(lastValid);
    return SyncRecoveryResult(
      recovered: ok,
      lastValidIndex: lastValid,
      rollbackCount: rollbackCount,
    );
  }
}
