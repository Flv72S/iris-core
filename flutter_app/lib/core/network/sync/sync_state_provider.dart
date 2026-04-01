/// O4 — Local state and signing for pull sync. Protocol uses this; never mutates without verification.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

/// Provides local ledger, replay engine, signing, and merge. Replay-before-merge uses this.
abstract interface class SyncStateProvider<S extends DeterministicState, E extends DeterministicEvent> {
  DeterministicLedger<S> get currentLedger;
  DeterministicReplayEngine<S, E> get replayEngine;

  /// Node id for senderNodeId in envelopes.
  String get nodeId;

  /// Sign bytes; returns base64 signature.
  Future<String> sign(List<int> bytes);

  /// Deserialize state from canonical map (e.g. from snapshot).
  S stateFromMap(Map<String, dynamic> map);

  /// Serialize event to canonical map (for segment response).
  Map<String, dynamic> eventToMap(E event);

  /// Deserialize event from canonical map (e.g. from segment).
  E eventFromMap(Map<String, dynamic> map);

  /// Serialize snapshot to string for SNAPSHOT_RESPONSE.snapshotData.
  String snapshotToData(StateSnapshot<S> snapshot);

  /// Deserialize snapshot from string (remote).
  StateSnapshot<S> snapshotFromData(String data);

  /// Events from index [fromIndex] to end (for LEDGER_SEGMENT_RESPONSE).
  List<E> getEventsFrom(int fromIndex);

  /// Replace local ledger with verified ledger after replay validation.
  void mergeLedger(DeterministicLedger<S> verifiedLedger);
}
