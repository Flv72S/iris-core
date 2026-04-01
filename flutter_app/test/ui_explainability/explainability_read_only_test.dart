// Phase 11.5.2 — No append, no mutation, no write from explainability layer.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/explainability/explainability_controller.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

class SpyStore implements PersistenceStore {
  SpyStore(this.records);
  final List<PersistenceRecord> records;
  var appendCalled = false;

  @override
  Future<void> append(PersistenceRecord record) async {
    appendCalled = true;
  }

  @override
  Future<List<PersistenceRecord>> loadAll() async =>
      List<PersistenceRecord>.from(records);

  @override
  Future<void> clearAll() async {}
}

void main() {
  test('controller load does not call append', () async {
    final store = SpyStore(<PersistenceRecord>[]);
    final controller = ExplainabilityController(store: store);
    await controller.load();
    expect(store.appendCalled, isFalse);
  });

  test('explainability source has no append on store', () {
    final dir = Directory('lib/ui/explainability');
    for (final f in dir.listSync()) {
      if (f is File && f.path.endsWith('.dart')) {
        expect(
          f.readAsStringSync().contains('.append('),
          isFalse,
          reason: '${f.path} read-only',
        );
      }
    }
  });
}
