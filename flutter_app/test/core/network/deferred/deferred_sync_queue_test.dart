import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_queue_codec.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_queue_store.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_sync_manager.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_sync_queue.dart';
import 'package:iris_flutter_app/core/network/deferred/file_deferred_queue_store.dart';
import 'package:iris_flutter_app/core/network/deferred/in_memory_deferred_queue_store.dart';

DeferredOperation op({
  required String id,
  DeferredOperationType type = DeferredOperationType.requestSnapshot,
  Map<String, dynamic>? payload,
  String? createdAt,
  int retryCount = 0,
}) {
  return DeferredOperation(
    id: id,
    type: type,
    payload: payload ?? {'targetNodeId': 'node-1'},
    createdAt: createdAt ?? '2025-01-01T00:00:00Z',
    retryCount: retryCount,
  );
}

void main() {
  group('DeferredSyncQueue', () {
    test('enqueue and dequeue FIFO', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'a'));
      queue.enqueue(op(id: 'b'));
      expect(queue.dequeue()?.id, 'a');
      expect(queue.dequeue()?.id, 'b');
      expect(queue.dequeue(), isNull);
    });

    test('peek does not remove', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'x'));
      expect(queue.peek()?.id, 'x');
      expect(queue.peek()?.id, 'x');
      expect(queue.dequeue()?.id, 'x');
      expect(queue.peek(), isNull);
    });

    test('no duplicate operation IDs', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'dup'));
      expect(() => queue.enqueue(op(id: 'dup')), throwsStateError);
    });

    test('markFailed increments retryCount', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'f', retryCount: 1));
      queue.markFailed('f');
      final o = queue.peek();
      expect(o?.retryCount, 2);
    });

    test('markCompleted removes operation', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'c'));
      queue.markCompleted('c');
      expect(queue.peek(), isNull);
      expect(queue.getAll(), isEmpty);
    });

    test('getAll returns FIFO order', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: '1'));
      queue.enqueue(op(id: '2'));
      final all = queue.getAll();
      expect(all.length, 2);
      expect(all[0].id, '1');
      expect(all[1].id, '2');
    });
  });

  group('Persistence across restart', () {
    test('save and load restore queue (codec round-trip)', () {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'p1', createdAt: '2025-06-01T12:00:00Z'));
      queue.enqueue(op(id: 'p2', type: DeferredOperationType.requestLedgerSegment, payload: {'fromHeight': 3}));
      final json = DeferredQueueCodec.toCanonicalJson(queue.getAll());
      final loaded = DeferredQueueCodec.fromCanonicalJson(json);
      expect(loaded.length, 2);
      expect(loaded[0].id, 'p1');
      expect(loaded[1].id, 'p2');
      expect(loaded[1].type, DeferredOperationType.requestLedgerSegment);
      expect(loaded[1].payload['fromHeight'], 3);
    });

    test('file store persists across restart', () {
      final dir = Directory.systemTemp.createTempSync('iris_o6_deferred_');
      final path = '${dir.path}/deferred_queue.json';
      try {
        final store = FileDeferredQueueStore(filePath: path);
        final queue = DeferredSyncQueue(store: store);
        queue.enqueue(op(id: 'f1'));
        queue.enqueue(op(id: 'f2'));
        final queue2 = DeferredSyncQueue(store: FileDeferredQueueStore(filePath: path));
        final loaded = queue2.getAll();
        expect(loaded.length, 2);
        expect(loaded[0].id, 'f1');
        expect(loaded[1].id, 'f2');
      } finally {
        dir.deleteSync(recursive: true);
      }
    });
  });

  group('DeferredSyncManager', () {
    test('resume processing after connect', () async {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      final executed = <String>[];
      queue.enqueue(op(id: 'e1'));
      queue.enqueue(op(id: 'e2'));
      final manager = DeferredSyncManager(
        queue: queue,
        executeOperation: (o) async {
          executed.add(o.id);
          return true;
        },
      );
      await manager.onTransportConnected();
      expect(executed, ['e1', 'e2']);
      expect(queue.getAll(), isEmpty);
    });

    test('stop processing on validation failure', () async {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'fail'));
      queue.enqueue(op(id: 'after'));
      final manager = DeferredSyncManager(
        queue: queue,
        executeOperation: (_) async => false,
      );
      await manager.onTransportConnected();
      final remaining = queue.getAll();
      expect(remaining.length, 2);
      expect(remaining[0].retryCount, 1);
      expect(remaining[0].id, 'fail');
    });

    test('partial queue execution', () async {
      final store = InMemoryDeferredQueueStore();
      final queue = DeferredSyncQueue(store: store);
      queue.enqueue(op(id: 'ok'));
      queue.enqueue(op(id: 'stop'));
      queue.enqueue(op(id: 'never'));
      var callCount = 0;
      final manager = DeferredSyncManager(
        queue: queue,
        executeOperation: (o) async {
          callCount++;
          return o.id != 'stop';
        },
      );
      await manager.onTransportConnected();
      expect(callCount, 2);
      final remaining = queue.getAll();
      expect(remaining.length, 2);
      expect(remaining[0].id, 'stop');
      expect(remaining[0].retryCount, 1);
      expect(remaining[1].id, 'never');
    });
  });

  group('DeferredQueueCodec corrupted data', () {
    test('fail fast on invalid JSON', () {
      expect(
        () => DeferredQueueCodec.fromCanonicalJson('not json'),
        throwsA(isA<FormatException>()),
      );
    });

    test('fail fast on root not array', () {
      expect(
        () => DeferredQueueCodec.fromCanonicalJson('{"id":"x"}'),
        throwsA(isA<FormatException>().having((e) => e.message, 'message', contains('array'))),
      );
    });

    test('fail fast on invalid operation type', () {
      final json = '''[{"id":"a","type":"INVALID","payload":{},"createdAt":"x","retryCount":0}]''';
      expect(
        () => DeferredQueueCodec.fromCanonicalJson(json),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
