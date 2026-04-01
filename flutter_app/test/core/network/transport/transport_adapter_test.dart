import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/message/deterministic_message_envelope.dart';
import 'package:iris_flutter_app/core/network/transport/local_loopback_transport_adapter.dart';
import 'package:iris_flutter_app/core/network/transport/transport_adapter.dart';
import 'package:iris_flutter_app/core/network/transport/websocket_transport_adapter.dart';

void main() {
  DeterministicMessageEnvelope sampleEnvelope() => const DeterministicMessageEnvelope(
        messageId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        senderNodeId: 'ffffffff-0000-4111-8222-666666666666',
        protocolVersion: '1.0',
        payloadType: 'NODE_PING',
        payloadHash: '00000001',
        payload: '{}',
        signature: 'c2ln',
      );

  group('LocalLoopbackTransportAdapter', () {
    test('Message exchange: sent message equals received message (deep equality)', () async {
      final a = LocalLoopbackTransportAdapter();
      final b = LocalLoopbackTransportAdapter();
      a.link(b);

      DeterministicMessageEnvelope? received;
      b.onMessage((msg) => received = msg);

      final sent = sampleEnvelope();
      await a.send(sent);

      await Future.microtask(() {});

      expect(received, isNotNull);
      expect(received!.messageId, sent.messageId);
      expect(received!.senderNodeId, sent.senderNodeId);
      expect(received!.protocolVersion, sent.protocolVersion);
      expect(received!.payloadType, sent.payloadType);
      expect(received!.payloadHash, sent.payloadHash);
      expect(received!.payload, sent.payload);
      expect(received!.signature, sent.signature);
    });

    test('Bidirectional: A sends to B, B sends to A', () async {
      final a = LocalLoopbackTransportAdapter();
      final b = LocalLoopbackTransportAdapter();
      a.link(b);

      DeterministicMessageEnvelope? receivedByB;
      DeterministicMessageEnvelope? receivedByA;
      b.onMessage((msg) => receivedByB = msg);
      a.onMessage((msg) => receivedByA = msg);

      final fromA = sampleEnvelope();
      final fromB = const DeterministicMessageEnvelope(
        messageId: 'bbbbbbbb-cccc-4ddd-8eee-777777777777',
        senderNodeId: 'aaaaaaaa-bbbb-4ccc-8ddd-888888888888',
        protocolVersion: '1.0',
        payloadType: 'SYNC_STATUS',
        payloadHash: 'deadbeef',
        payload: '{"x":1}',
        signature: 'sig2',
      );

      await a.send(fromA);
      await b.send(fromB);

      await Future.microtask(() {});

      expect(receivedByB?.messageId, fromA.messageId);
      expect(receivedByA?.messageId, fromB.messageId);
    });

    test('No mutation: received envelope has same field values as sent', () async {
      final a = LocalLoopbackTransportAdapter();
      final b = LocalLoopbackTransportAdapter();
      a.link(b);

      final sent = sampleEnvelope();
      DeterministicMessageEnvelope? received;
      b.onMessage((msg) => received = msg);

      await a.send(sent);
      await Future.microtask(() {});

      expect(received, equals(sent));
      expect(received?.hashCode, sent.hashCode);
    });

    test('Connect and disconnect do not throw', () async {
      final a = LocalLoopbackTransportAdapter();
      await a.connect();
      await a.disconnect();
    });
  });

  group('Transport error propagation', () {
    test('LocalLoopbackTransportAdapter: disconnect then send does not throw', () async {
      final a = LocalLoopbackTransportAdapter();
      final b = LocalLoopbackTransportAdapter();
      a.link(b);
      await a.disconnect();
      await a.send(sampleEnvelope());
    });
  });

  group('WebSocketTransportAdapter', () {
    test('Disconnect without connect does not throw', () async {
      final a = WebSocketTransportAdapter(Uri.parse('ws://localhost:1'));
      await a.disconnect();
    });

    test('Connect to invalid endpoint throws or fails', () async {
      final a = WebSocketTransportAdapter(Uri.parse('ws://invalid.invalid:9999'));
      try {
        await a.connect();
        await a.disconnect();
      } on SocketException catch (_) {
        // Expected when no route to host
      } on WebSocketException catch (_) {
        // Connection failed
      } on Exception catch (_) {
        // Connection failed on some platforms
      }
    });
  });
}
