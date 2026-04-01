// Phase 11.6.1 — Invalid record → throw; bundle not created.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle_builder.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart'; // PersistenceException

class StoreWithInvalidRecord implements PersistenceStore {
  StoreWithInvalidRecord();

  @override
  Future<void> append(PersistenceRecord record) async {}

  @override
  Future<List<PersistenceRecord>> loadAll() async {
    return [
      SessionStartRecord(sessionId: 'session-1'),
      TraceRecord(traceJson: <String, dynamic>{
        'traceId': 'x',
        'signals': <String, dynamic>{},
        'state': <String, dynamic>{},
        'resolution': '',
        'execution': <String, dynamic>{},
        'outcome': <String, dynamic>{'status': 'ok', 'effects': <dynamic>[]},
        'timestamp': '1970-01-01T00:00:00Z',
      }),
    ];
  }

  @override
  Future<void> clearAll() async {}
}

void main() {
  test('invalid trace record throws bundle not created', () async {
    final store = StoreWithInvalidRecord();
    final builder = ForensicBundleBuilder(appVersion: '1.0.0');
    expect(
      () async => await builder.build(store),
      throwsA(isA<PersistenceException>()),
    );
  });
}
