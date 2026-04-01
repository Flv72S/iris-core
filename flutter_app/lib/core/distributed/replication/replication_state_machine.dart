// ODA-2 — Explicit sync phases. Deterministic transitions.

enum ReplicationState {
  init,
  snapshotCompare,
  continuityCheck,
  deltaRequest,
  deltaValidation,
  syncComplete,
  divergenceDetected,
  sessionAborted,
}

enum ReplicationEvent {
  peerSnapshotReceived,
  continuityOk,
  continuityFailed,
  deltaReceived,
  deltaValid,
  deltaInvalid,
  syncDone,
  forkDetected,
  abort,
}

class ReplicationStateMachine {
  ReplicationStateMachine() : _state = ReplicationState.init;
  ReplicationState _state;
  ReplicationState get currentState => _state;

  void transition(ReplicationEvent event) {
    switch (_state) {
      case ReplicationState.init:
        if (event == ReplicationEvent.peerSnapshotReceived) _state = ReplicationState.snapshotCompare;
        if (event == ReplicationEvent.abort) _state = ReplicationState.sessionAborted;
        break;
      case ReplicationState.snapshotCompare:
        if (event == ReplicationEvent.continuityOk) _state = ReplicationState.continuityCheck;
        if (event == ReplicationEvent.forkDetected) _state = ReplicationState.divergenceDetected;
        if (event == ReplicationEvent.abort) _state = ReplicationState.sessionAborted;
        break;
      case ReplicationState.continuityCheck:
        if (event == ReplicationEvent.continuityOk) _state = ReplicationState.deltaRequest;
        if (event == ReplicationEvent.continuityFailed) _state = ReplicationState.sessionAborted;
        if (event == ReplicationEvent.abort) _state = ReplicationState.sessionAborted;
        break;
      case ReplicationState.deltaRequest:
        if (event == ReplicationEvent.deltaReceived) _state = ReplicationState.deltaValidation;
        if (event == ReplicationEvent.abort) _state = ReplicationState.sessionAborted;
        break;
      case ReplicationState.deltaValidation:
        if (event == ReplicationEvent.deltaValid) _state = ReplicationState.syncComplete;
        if (event == ReplicationEvent.deltaInvalid) _state = ReplicationState.sessionAborted;
        if (event == ReplicationEvent.abort) _state = ReplicationState.sessionAborted;
        break;
      default:
        break;
    }
  }
}
