import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/network/observability/file_sync_audit_store.dart';
import 'package:iris_flutter_app/core/network/observability/in_memory_sync_audit_store.dart';
import 'package:iris_flutter_app/core/network/observability/payload_hasher.dart';
import 'package:iris_flutter_app/core/network/observability/sync_audit_entry.dart';
import 'package:iris_flutter_app/core/network/observability/sync_event.dart';
import 'package:iris_flutter_app/core/network/observability/sync_metrics_collector.dart';
import 'package:iris_flutter_app/core/network/observability/sync_observer.dart';
import 'package:uuid/uuid.dart';

const _uuid = Uuid();

SyncEvent event({
  String? id,
  SyncEventType type = SyncEventType.syncStarted,
  String correlationId = 'corr-1',
  Map<String, dynamic>? payload,
  String createdAt = '2025-01-01T00:00:00Z',
}) {
  return SyncEvent(
    id: id ?? _uuid.v4(),
    type: type,
    correlationId: correlationId,
    payload: payload ?? {'source': 'test'},
    createdAt: createdAt,
  );
}

void main() {
  group('SyncEvent', () {
    test('creation with required fields', () {
      final e = event(id: 'id-1', payload: {'a': 1});
      expect(e.id, 'id-1');
      expect(e.type, SyncEventType.syncStarted);
      expect(e.correlationId, 'corr-1');
      expect(e.payload['a'], 1);
      expect(e.createdAt, isNotEmpty);
    });
  });

  group('PayloadHasher', () {
    test('deterministic hash for same payload', () {
      final p = {'k': 'v', 'n': 2};
      final h1 = PayloadHasher.hashPayload(p);
      final h2 = PayloadHasher.hashPayload(p);
      expect(h1, h2);
      expect(h1.length, 64);
    });

    test('different payload produces different hash', () {
      final h1 = PayloadHasher.hashPayload({'a': 1});
      final h2 = PayloadHasher.hashPayload({'a': 2});
      expect(h1, isNot(h2));
    });
  });

  group('SyncAuditStore', () {
    test('append and getByCorrelationId', () {
      final store = InMemorySyncAuditStore();
      final e1 = event(id: 'e1', correlationId: 'c1');
      final e2 = event(id: 'e2', correlationId: 'c1');
      final e3 = event(id: 'e3', correlationId: 'c2');
      store.append(e1);
      store.append(e2);
      store.append(e3);
      final byC1 = store.getByCorrelationId('c1');
      expect(byC1.length, 2);
      expect(byC1[0].eventId, 'e1');
      expect(byC1[1].eventId, 'e2');
      expect(store.getByCorrelationId('c2').length, 1);
    });

    test('append-only: duplicate event id throws', () {
      final store = InMemorySyncAuditStore();
      store.append(event(id: 'dup'));
      expect(() => store.append(event(id: 'dup')), throwsStateError);
    });

    test('getAll returns append order', () {
      final store = InMemorySyncAuditStore();
      store.append(event(id: 'a'));
      store.append(event(id: 'b'));
      store.append(event(id: 'c'));
      final all = store.getAll();
      expect(all.map((e) => e.eventId), ['a', 'b', 'c']);
    });

    test('getPayload returns stored payload', () {
      final store = InMemorySyncAuditStore();
      final pl = {'x': 1, 'y': 'z'};
      store.append(event(id: 'p1', payload: pl));
      final got = store.getPayload('p1');
      expect(got, isNotNull);
      expect(got!['x'], 1);
      expect(got['y'], 'z');
    });

    test('payloadHash in entry matches computed hash', () {
      final store = InMemorySyncAuditStore();
      final pl = {'k': 42};
      store.append(event(id: 'h1', payload: pl));
      final entry = store.getAll().single;
      expect(entry.payloadHash, PayloadHasher.hashPayload(pl));
    });
  });

  group('SyncMetricsCollector', () {
    test('increment and getMetrics', () {
      final metrics = SyncMetricsCollector();
      metrics.increment('totalSyncAttempts');
      metrics.increment('totalSyncAttempts');
      metrics.increment('forksDetected');
      final m = metrics.getMetrics();
      expect(m['totalSyncAttempts'], 2);
      expect(m['forksDetected'], 1);
    });

    test('reset clears all', () {
      final metrics = SyncMetricsCollector();
      metrics.increment('a');
      metrics.reset();
      expect(metrics.getMetrics(), isEmpty);
    });
  });

  group('SyncObserver', () {
    test('record appends to store and increments metrics', () {
      final store = InMemorySyncAuditStore();
      final metrics = SyncMetricsCollector();
      final observer = SyncObserver(store: store, metrics: metrics);
      observer.record(event(id: 'r1', type: SyncEventType.syncStarted));
      observer.record(event(id: 'r2', type: SyncEventType.syncStarted));
      expect(store.getAll().length, 2);
      expect(metrics.getMetrics()['totalSyncAttempts'], 2);
    });

    test('audit failure must not throw', () {
      final store = InMemorySyncAuditStore();
      final metrics = SyncMetricsCollector();
      final observer = SyncObserver(store: store, metrics: metrics);
      observer.record(event(id: 'f1'));
      expect(() => observer.record(event(id: 'f1')), returnsNormally);
      expect(store.getAll().length, 1);
    });
  });

  group('Edge cases', () {
    test('payload hash mismatch: entry stores hash of payload', () {
      final store = InMemorySyncAuditStore();
      store.append(event(id: 'm1', payload: {'a': 1}));
      final entry = store.getAll().single;
      final wrongHash = PayloadHasher.hashPayload({'a': 2});
      expect(entry.payloadHash, isNot(wrongHash));
    });

    test('large number of events ordering consistency', () {
      final store = InMemorySyncAuditStore();
      const n = 100;
      for (var i = 0; i < n; i++) {
        store.append(event(id: 'ord-$i', payload: {'i': i}));
      }
      final all = store.getAll();
      expect(all.length, n);
      for (var i = 0; i < n; i++) {
        expect(all[i].eventId, 'ord-$i');
      }
    });
  });

  group('Persistence across restart', () {
    test('file store persists and reloads', () {
      final dir = Directory.systemTemp.createTempSync('iris_o9_audit_');
      final path = '${dir.path}/audit.ndjson';
      try {
        final fileStore = FileSyncAuditStore(filePath: path);
        fileStore.append(event(id: 'persist-1', payload: {'p': 1}));
        fileStore.append(event(id: 'persist-2', payload: {'p': 2}));
        final loaded = FileSyncAuditStore(filePath: path);
        final all = loaded.getAll();
        expect(all.length, 2);
        expect(loaded.getPayload('persist-1')!['p'], 1);
      } finally {
        dir.deleteSync(recursive: true);
      }
    });

    test('corrupted audit file fails fast on load', () {
      final dir = Directory.systemTemp.createTempSync('iris_o9_corrupt_');
      final path = '${dir.path}/bad.ndjson';
      try {
        File(path).writeAsStringSync('not valid json\n');
        final store = FileSyncAuditStore(filePath: path);
        expect(() => store.getAll(), throwsA(isA<FormatException>()));
      } finally {
        dir.deleteSync(recursive: true);
      }
    });
  });
}
