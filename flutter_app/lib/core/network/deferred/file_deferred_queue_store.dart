/// O6 — File-based persistence. Canonical JSON; fail fast on read error.

import 'dart:io';

import 'package:iris_flutter_app/core/network/deferred/deferred_operation.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_queue_codec.dart';
import 'package:iris_flutter_app/core/network/deferred/deferred_queue_store.dart';

class FileDeferredQueueStore implements DeferredQueueStore {
  FileDeferredQueueStore({required this.filePath});

  final String filePath;

  @override
  List<DeferredOperation> load() {
    final file = File(filePath);
    if (!file.existsSync()) return [];
    final json = file.readAsStringSync();
    if (json.trim().isEmpty) return [];
    return DeferredQueueCodec.fromCanonicalJson(json);
  }

  @override
  void save(List<DeferredOperation> operations) {
    final json = DeferredQueueCodec.toCanonicalJson(operations);
    final file = File(filePath);
    file.writeAsStringSync(json);
  }
}
