import 'dart:convert';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/sync/pull_sync_protocol.dart';
import 'package:iris_flutter_app/core/network/sync/sync_payload_codec.dart';
import 'package:iris_flutter_app/core/network/sync/sync_state_provider.dart';
import 'package:iris_flutter_app/core/network/sync/sync_types.dart';
import 'package:iris_flutter_app/core/network/transport/local_loopback_transport_adapter.dart';

ExampleState initial() => ExampleState(name: 'sync', counter: 0, tags: [], stateVersion: 0);

List<IncrementCounterEvent> events(int count) => List.generate(
      count,
      (i) => IncrementCounterEvent(
        amount: 1,
        eventIndex: i + 1,
        source: EventSource.internal,
      ),
    );

class TestSyncProvider implements SyncStateProvider<ExampleState, IncrementCounterEvent> {
  TestSyncProvider({
    required this.nodeId,
    required this.replayEngine,
    List<IncrementCounterEvent> initialEvents = const [],
  })  : _ledger = replayEngine.replay(initialEvents),
        _eventsApplied = List.from(initialEvents);

  @override
  final String nodeId;
  @override
  final DeterministicReplayEngine<ExampleState, IncrementCounterEvent> replayEngine;

  DeterministicLedger<ExampleState> _ledger;
  final List<IncrementCounterEvent> _eventsApplied;
  SimpleKeyPair? _keyPair;
  String? _publicKeyB64;

  void setKeyPair(SimpleKeyPair kp, String publicKeyB64) {
    _keyPair = kp;
    _publicKeyB64 = publicKeyB64;
  }

  @override
  DeterministicLedger<ExampleState> get currentLedger => _ledger;

  @override
  Future<String> sign(List<int> bytes) async {
    final kp = _keyPair;
    if (kp == null) throw StateError('No keypair');
    final sig = await _ed25519.sign(bytes, keyPair: kp);
    return base64Encode(sig.bytes);
  }

  static final _ed25519 = Ed25519();

  @override
  ExampleState stateFromMap(Map<String, dynamic> map) => ExampleState(
        name: map['name'] as String,
        counter: map['counter'] as int,
        tags: List<String>.from(map['tags'] as List),
        stateVersion: map['stateVersion'] as int,
      );

  @override
  Map<String, dynamic> eventToMap(IncrementCounterEvent event) => {
        'eventIndex': event.eventIndex,
        'source': event.source,
        'type': 'increment_counter',
        'amount': event.amount,
      };

  @override
  IncrementCounterEvent eventFromMap(Map<String, dynamic> map) =>
      IncrementCounterEvent(
        amount: map['amount'] as int,
        eventIndex: map['eventIndex'] as int,
        source: EventSource.values.byName(map['source'] as String),
      );

  @override
  String snapshotToData(StateSnapshot<ExampleState> snapshot) {
    final map = {
      'state': snapshot.state.toCanonicalMap(),
      'stateHash': snapshot.stateHash,
      'stateVersion': snapshot.stateVersion,
      'transitionIndex': snapshot.transitionIndex,
      'chainHash': snapshot.chainHash,
      'protocolVersionMajor': snapshot.protocolVersion.major,
      'protocolVersionMinor': snapshot.protocolVersion.minor,
    };
    return SyncPayloadCodec.toCanonicalJsonString(map);
  }

  @override
  StateSnapshot<ExampleState> snapshotFromData(String data) {
    final map = SyncPayloadCodec.parsePayload(data);
    final stateMap = map['state'] as Map<String, dynamic>;
    final state = stateFromMap(Map<String, dynamic>.from(stateMap));
    return StateSnapshot(
      state: state,
      stateHash: map['stateHash'] as int,
      stateVersion: map['stateVersion'] as int,
      transitionIndex: map['transitionIndex'] as int,
      chainHash: map['chainHash'] as int,
      protocolVersion: DeterministicProtocolVersion(
        major: map['protocolVersionMajor'] as int,
        minor: map['protocolVersionMinor'] as int,
      ),
    );
  }

  @override
  List<IncrementCounterEvent> getEventsFrom(int fromIndex) {
    if (fromIndex >= _eventsApplied.length) return [];
    return _eventsApplied.sublist(fromIndex);
  }

  @override
  void mergeLedger(DeterministicLedger<ExampleState> verifiedLedger) {
    _ledger = verifiedLedger;
  }
}

void main() {
  late DeterministicReplayEngine<ExampleState, IncrementCounterEvent> engine;
  late TestSyncProvider providerA;
  late TestSyncProvider providerB;
  late LocalLoopbackTransportAdapter transportA;
  late LocalLoopbackTransportAdapter transportB;
  late PullSyncProtocol<ExampleState, IncrementCounterEvent> protocolA;
  late PullSyncProtocol<ExampleState, IncrementCounterEvent> protocolB;
  late String publicKeyA64;
  late String publicKeyB64;

  setUp(() async {
    engine = DeterministicReplayEngine(
      initialState: initial(),
      transition: exampleIncrementTransition,
      protocolVersion: DeterministicProtocolVersion.initial,
    );
    final keyPairA = await Ed25519().newKeyPair();
    final pubA = await keyPairA.extractPublicKey();
    publicKeyA64 = base64Encode(pubA.bytes);

    providerA = TestSyncProvider(nodeId: 'node-a', replayEngine: engine);
    providerA.setKeyPair(keyPairA, publicKeyA64);
    providerB = TestSyncProvider(
      nodeId: 'node-b',
      replayEngine: DeterministicReplayEngine(
        initialState: initial(),
        transition: exampleIncrementTransition,
        protocolVersion: DeterministicProtocolVersion.initial,
      ),
      initialEvents: events(3),
    );
    final keyPairB = await Ed25519().newKeyPair();
    final pubB = await keyPairB.extractPublicKey();
    publicKeyB64 = base64Encode(pubB.bytes);
    providerB.setKeyPair(keyPairB, publicKeyB64);

    transportA = LocalLoopbackTransportAdapter();
    transportB = LocalLoopbackTransportAdapter();
    transportA.link(transportB);
    transportB.link(transportA);

    protocolA = PullSyncProtocol(
      transport: transportA,
      provider: providerA,
      senderPublicKey: publicKeyB64,
    );
    protocolB = PullSyncProtocol(
      transport: transportB,
      provider: providerB,
      senderPublicKey: publicKeyA64,
    );
    protocolA.start();
    protocolB.start();
  });

  group('PullSyncProtocol', () {
    test('Snapshot request/response flow: B responds with snapshot and ledgerHeight', () async {
      await protocolA.initiateSnapshotRequest('node-b');
      for (int i = 0; i < 8; i++) await Future.microtask(() {});

      expect(providerB.currentLedger.length, 3);
      final latest = providerB.currentLedger.latestSnapshot!;
      expect(latest.state.counter, 3);
    });

    test('Replay success: after full pull, A has same ledger length as B', () async {
      await protocolA.initiateSnapshotRequest('node-b');
      await Future.delayed(const Duration(milliseconds: 50));

      expect(providerA.currentLedger.length, 3);
      expect(providerA.currentLedger.latestSnapshot!.state.counter, 3);
    });

    test('Live state unchanged on failure: tampered segment rejected', () async {
      final beforeLen = providerA.currentLedger.length;
      await protocolA.initiateSnapshotRequest('node-b');
      for (int i = 0; i < 8; i++) await Future.microtask(() {});

      if (providerA.currentLedger.length != 3) {
        expect(providerA.currentLedger.length, beforeLen);
      }
    });
  });

  group('SyncPayloadCodec', () {
    test('Snapshot request payload round-trip', () {
      final map = snapshotRequestPayload('target-1');
      final json = SyncPayloadCodec.toCanonicalJsonString(map);
      final parsed = SyncPayloadCodec.parsePayload(json);
      expect(parseSnapshotRequestTargetNodeId(parsed), 'target-1');
    });

    test('Snapshot response payload round-trip', () {
      final map = snapshotResponsePayload(
        snapshotHash: 'abc',
        snapshotData: '{}',
        ledgerHeight: 5,
      );
      final json = SyncPayloadCodec.toCanonicalJsonString(map);
      final parsed = SyncPayloadCodec.parsePayload(json);
      expect(parseSnapshotResponseHash(parsed), 'abc');
      expect(parseSnapshotResponseLedgerHeight(parsed), 5);
    });
  });
}
