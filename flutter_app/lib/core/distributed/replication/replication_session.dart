// ODA-2 — Sync session between two nodes. Reconstructable from deterministic inputs.

import 'package:iris_flutter_app/core/distributed/cluster_state_snapshot.dart';

enum SyncDirection { none, weReceive, weSend }

class ReplicationSessionState {
  const ReplicationSessionState({
    required this.peerNodeId,
    required this.localLedgerHeight,
    required this.peerLedgerHeight,
    required this.divergenceIndex,
    required this.syncDirection,
    required this.validationState,
  });
  final String peerNodeId;
  final int localLedgerHeight;
  final int peerLedgerHeight;
  final int divergenceIndex;
  final SyncDirection syncDirection;
  final String validationState;
}

class ReplicationSession {
  ReplicationSession({required this.peerNodeId});

  final String peerNodeId;
  int _localLedgerHeight = 0;
  int _peerLedgerHeight = 0;
  int _divergenceIndex = -1;
  SyncDirection _syncDirection = SyncDirection.none;
  String _validationState = 'pending';
  ClusterStateSnapshot? _peerSnapshot;

  int get localLedgerHeight => _localLedgerHeight;
  int get peerLedgerHeight => _peerLedgerHeight;
  int get divergenceIndex => _divergenceIndex;
  SyncDirection get syncDirection => _syncDirection;
  String get validationState => _validationState;

  void startSession(int localHeight, int peerHeight, ClusterStateSnapshot peerSnapshot) {
    _localLedgerHeight = localHeight;
    _peerSnapshot = peerSnapshot;
    _peerLedgerHeight = peerHeight;
    _validationState = 'snapshot_received';
  }

  void processPeerSnapshot(ClusterStateSnapshot snapshot) {
    _peerSnapshot = snapshot;
  }

  void setDivergence(int index, SyncDirection direction) {
    _divergenceIndex = index;
    _syncDirection = direction;
  }

  void setValidationState(String state) {
    _validationState = state;
  }

  void closeSession() {
    _validationState = 'closed';
  }

  ReplicationSessionState getSessionState() {
    return ReplicationSessionState(
      peerNodeId: peerNodeId,
      localLedgerHeight: _localLedgerHeight,
      peerLedgerHeight: _peerLedgerHeight,
      divergenceIndex: _divergenceIndex,
      syncDirection: _syncDirection,
      validationState: _validationState,
    );
  }
}
