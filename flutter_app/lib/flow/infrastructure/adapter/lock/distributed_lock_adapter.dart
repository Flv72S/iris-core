// K4.1 — In-memory distributed lock adapter. FIFO, ownership-safe, event-driven.

import 'dart:async';

import 'package:iris_flutter_app/flow/infrastructure/port/distributed_lock_port.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';

/// Waiter in the FIFO queue: owns a completer that is completed when the lock is granted.
class _LockWaiter {
  _LockWaiter(this.ownerId) : completer = Completer<void>();
  final String ownerId;
  final Completer<void> completer;
}

/// Per-key state: current owner and FIFO queue of waiters.
class _LockState {
  _LockState(this.ownerId) : waitQueue = [];
  String ownerId;
  final List<_LockWaiter> waitQueue;
}

/// In-memory implementation of [DistributedLockPort].
/// FIFO fairness, ownership tracking, event-driven (Completer); no busy polling.
class InMemoryDistributedLockAdapter implements DistributedLockPort {
  InMemoryDistributedLockAdapter();

  final _locks = <String, _LockState>{};
  int _ownerCounter = 0;

  String _nextOwnerId() => '${++_ownerCounter}';

  @override
  Future<void> acquireLock(String lockKey) async {
    try {
      final state = _locks[lockKey];
      if (state != null) {
        throw LockException('Lock already held: $lockKey');
      }
      _locks[lockKey] = _LockState(_nextOwnerId());
    } catch (e) {
      if (e is LockException) rethrow;
      throw LockException('acquireLock failed', e);
    }
  }

  @override
  Future<void> releaseLock(String lockKey) async {
    try {
      final state = _locks[lockKey];
      if (state == null) {
        throw LockException('Lock not held: $lockKey');
      }
      if (state.waitQueue.isEmpty) {
        _locks.remove(lockKey);
        return;
      }
      final waiter = state.waitQueue.removeAt(0);
      state.ownerId = waiter.ownerId;
      waiter.completer.complete();
    } catch (e) {
      if (e is LockException) rethrow;
      throw LockException('releaseLock failed', e);
    }
  }

  @override
  Future<bool> tryAcquireLock(String lockKey, Duration timeout) async {
    try {
      var state = _locks[lockKey];
      if (state == null) {
        _locks[lockKey] = _LockState(_nextOwnerId());
        return true;
      }
      final waiter = _LockWaiter(_nextOwnerId());
      state.waitQueue.add(waiter);

      final completedFirst = await Future.any<bool>([
        waiter.completer.future.then((_) => true),
        Future.delayed(timeout, () => false),
      ]);

      if (!completedFirst) {
        state.waitQueue.remove(waiter);
        return false;
      }
      return true;
    } catch (e) {
      if (e is LockException) rethrow;
      throw LockException('tryAcquireLock failed', e);
    }
  }
}
