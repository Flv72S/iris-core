/// O4 — Pull-only sync. Replay-before-merge; no blind trust.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/message/message_envelope_serializer.dart';
import 'package:iris_flutter_app/core/network/message/message_types.dart';
import 'package:iris_flutter_app/core/network/transport/transport_adapter.dart';
import 'package:iris_flutter_app/core/network/sync/sync_message_factory.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';
import 'package:iris_flutter_app/core/network/sync/sync_state_provider.dart';
import 'package:iris_flutter_app/core/network/sync/sync_types.dart';
import 'package:iris_flutter_app/core/network/sync/sync_validator.dart';

/// Two-node pull sync. Replay verification before merge; live state unchanged on failure.
class PullSyncProtocol<S extends DeterministicState, E extends DeterministicEvent> {
  PullSyncProtocol({
    required this.transport,
    required this.provider,
    required this.senderPublicKey,
  });

  final TransportAdapter transport;
  final SyncStateProvider<S, E> provider;
  final String senderPublicKey;

  String? _pendingRemoteSnapshotHash;
  int? _pendingFromHeight;

  /// Call once to register message handler. Responder and requester logic run on incoming envelopes.
  void start() {
    transport.onMessage(_handleMessage);
  }

  void _handleMessage(DeterministicMessageEnvelope envelope) {
    if (envelope.payloadType == MessageTypes.snapshotRequest) {
      _handleSnapshotRequest(envelope);
      return;
    }
    if (envelope.payloadType == MessageTypes.snapshotResponse) {
      _handleSnapshotResponse(envelope);
      return;
    }
    if (envelope.payloadType == MessageTypes.ledgerSegmentRequest) {
      _handleLedgerSegmentRequest(envelope);
      return;
    }
    if (envelope.payloadType == MessageTypes.ledgerSegmentResponse) {
      _handleLedgerSegmentResponse(envelope);
      return;
    }
  }

  Future<void> _handleSnapshotRequest(DeterministicMessageEnvelope envelope) async {
    final result = SyncValidator.validatePayloadStructure(envelope);
    if (!result.success) return;
    final map = SyncPayloadCodec.parsePayload(envelope.payload);
    final ledger = provider.currentLedger;
    final latest = ledger.latestSnapshot;
    if (latest == null) return;
    final snapshotData = provider.snapshotToData(latest);
    final snapshotHash = latest.stateHash.toRadixString(16);
    final response = SyncMessageFactory.snapshotResponse(
      senderNodeId: provider.nodeId,
      snapshotHash: snapshotHash,
      snapshotData: snapshotData,
      ledgerHeight: ledger.length,
    );
    final signed = await _signEnvelope(response);
    await transport.send(signed);
  }

  Future<void> _handleSnapshotResponse(DeterministicMessageEnvelope envelope) async {
    final validation = await SyncValidator.validateEnvelope(
      envelope,
      senderPublicKey: senderPublicKey,
    );
    if (!validation.success) return;
    final map = SyncPayloadCodec.parsePayload(envelope.payload);
    final remoteHash = parseSnapshotResponseHash(map);
    final remoteHeight = parseSnapshotResponseLedgerHeight(map);
    final localLedger = provider.currentLedger;
    final localLatest = localLedger.latestSnapshot;
    final localHash = localLatest?.stateHash.toRadixString(16) ?? '';
    int fromHeight;
    if (remoteHash == localHash) {
      fromHeight = localLedger.length;
      if (fromHeight >= remoteHeight) return;
    } else {
      fromHeight = 0;
    }
    _pendingRemoteSnapshotHash = remoteHash;
    _pendingFromHeight = fromHeight;
    final request = SyncMessageFactory.ledgerSegmentRequest(
      senderNodeId: provider.nodeId,
      fromHeight: fromHeight,
    );
    final signed = await _signEnvelope(request);
    await transport.send(signed);
  }

  Future<void> _handleLedgerSegmentRequest(DeterministicMessageEnvelope envelope) async {
    final result = SyncValidator.validatePayloadStructure(envelope);
    if (!result.success) return;
    final map = SyncPayloadCodec.parsePayload(envelope.payload);
    final fromHeight = parseLedgerSegmentRequestFromHeight(map);
    final events = provider.getEventsFrom(fromHeight);
    final engine = provider.replayEngine;
    final ledger = provider.currentLedger;
    S startState;
    int previousChainHash;
    int transitionIndex;
    if (fromHeight == 0) {
      startState = engine.initialState;
      previousChainHash = SnapshotChainHasher.genesisChainHash;
      transitionIndex = 0;
    } else {
      final snap = ledger.getSnapshotAt(fromHeight - 1)!;
      startState = snap.state;
      previousChainHash = snap.chainHash;
      transitionIndex = fromHeight;
    }
    final tempLedger = DeterministicLedger<S>();
    S state = startState;
    for (final event in events) {
      final newState = engine.transition(state, event);
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previousChainHash,
        stateHash: newState.deterministicHash,
        stateVersion: newState.stateVersion,
        transitionIndex: transitionIndex,
        protocolVersion: engine.protocolVersion,
      );
      final snapshot = StateSnapshot<S>.fromState(
        state: newState,
        transitionIndex: transitionIndex,
        chainHash: chainHash,
        protocolVersion: engine.protocolVersion,
      );
      tempLedger.append(snapshot);
      previousChainHash = chainHash;
      state = newState;
      transitionIndex++;
    }
    final segmentHash = tempLedger.latestSnapshot?.chainHash.toRadixString(16) ?? '0';
    final eventMaps = events.map((e) => provider.eventToMap(e)).toList();
    final response = SyncMessageFactory.ledgerSegmentResponse(
      senderNodeId: provider.nodeId,
      events: eventMaps,
      segmentHash: segmentHash,
    );
    final signed = await _signEnvelope(response);
    await transport.send(signed);
  }

  Future<void> _handleLedgerSegmentResponse(DeterministicMessageEnvelope envelope) async {
    final validation = await SyncValidator.validateEnvelope(
      envelope,
      senderPublicKey: senderPublicKey,
    );
    if (!validation.success) return;
    final expectedHash = _pendingRemoteSnapshotHash;
    final fromHeight = _pendingFromHeight ?? 0;
    _pendingRemoteSnapshotHash = null;
    _pendingFromHeight = null;
    if (expectedHash == null) return;
    final map = SyncPayloadCodec.parsePayload(envelope.payload);
    final eventMaps = parseLedgerSegmentResponseEvents(map);
    final segmentHash = parseLedgerSegmentResponseSegmentHash(map);
    final events = <E>[];
    for (final m in eventMaps) {
      events.add(provider.eventFromMap(m));
    }
    final engine = provider.replayEngine;
    final ledger = provider.currentLedger;
    S startState;
    int previousChainHash;
    int transitionIndex;
    if (fromHeight == 0) {
      startState = engine.initialState;
      previousChainHash = SnapshotChainHasher.genesisChainHash;
      transitionIndex = 0;
    } else {
      final snap = ledger.getSnapshotAt(fromHeight - 1)!;
      startState = snap.state;
      previousChainHash = snap.chainHash;
      transitionIndex = fromHeight;
    }
    final tempLedger = DeterministicLedger<S>();
    S state = startState;
    for (final event in events) {
      final newState = engine.transition(state, event);
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previousChainHash,
        stateHash: newState.deterministicHash,
        stateVersion: newState.stateVersion,
        transitionIndex: transitionIndex,
        protocolVersion: engine.protocolVersion,
      );
      final snapshot = StateSnapshot<S>.fromState(
        state: newState,
        transitionIndex: transitionIndex,
        chainHash: chainHash,
        protocolVersion: engine.protocolVersion,
      );
      tempLedger.append(snapshot);
      previousChainHash = chainHash;
      state = newState;
      transitionIndex++;
    }
    if (!tempLedger.verifyFullChain()) return;
    final lastSnap = tempLedger.latestSnapshot!;
    final finalStateHash = lastSnap.stateHash.toRadixString(16);
    if (finalStateHash != expectedHash) return;
    final merged = DeterministicLedger<S>();
    for (var i = 0; i < fromHeight; i++) {
      merged.append(ledger.getSnapshotAt(i)!);
    }
    for (final s in tempLedger.snapshots) {
      merged.append(s);
    }
    provider.mergeLedger(merged);
  }

  /// Initiate pull: request snapshot from [targetNodeId].
  Future<void> initiateSnapshotRequest(String targetNodeId) async {
    final request = SyncMessageFactory.snapshotRequest(
      senderNodeId: provider.nodeId,
      targetNodeId: targetNodeId,
    );
    final signed = await _signEnvelope(request);
    await transport.send(signed);
  }

  Future<DeterministicMessageEnvelope> _signEnvelope(DeterministicMessageEnvelope envelope) async {
    final bytes = MessageEnvelopeSerializer.toCanonicalBytesForSigning(envelope);
    final sigB64 = await provider.sign(bytes);
    return DeterministicMessageEnvelope(
      messageId: envelope.messageId,
      senderNodeId: envelope.senderNodeId,
      protocolVersion: envelope.protocolVersion,
      payloadType: envelope.payloadType,
      payloadHash: envelope.payloadHash,
      payload: envelope.payload,
      signature: sigB64,
    );
  }
}
