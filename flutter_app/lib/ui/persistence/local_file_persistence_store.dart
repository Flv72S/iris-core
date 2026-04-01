// Phase 11.5.1 — Append-only file store. JSONL, UTF-8, no rewrite. No DateTime/Random.

import 'dart:convert';
import 'dart:io';

import 'persistence_record.dart';
import 'persistence_store.dart'; // includes PersistenceException

/// Append-only file backend. One record per line (JSON). Ordering preserved. Idempotent on same hash.
class LocalFilePersistenceStore implements PersistenceStore {
  LocalFilePersistenceStore({required this.filePath});

  final String filePath;

  List<PersistenceRecord>? _cache;
  Map<String, String>? _idToHash;

  Future<File> _file() async => File(filePath);

  @override
  Future<void> append(PersistenceRecord record) async {
    final id = record.recordId;
    final hash = record.contentHash;
    await _ensureIndex();
    final existingHash = _idToHash![id];
    if (existingHash != null) {
      if (existingHash != hash) {
        throw PersistenceException('same recordId $id with different content');
      }
      return;
    }
    final f = await _file();
    final line = '${jsonEncode(record.toJson())}\n';
    await f.writeAsString(line, mode: FileMode.append, encoding: utf8);
    _idToHash![id] = hash;
    _cache!.add(record);
  }

  Future<void> _ensureIndex() async {
    if (_cache != null) return;
    _cache = await loadAll();
    _idToHash = <String, String>{};
    for (final r in _cache!) {
      final existing = _idToHash![r.recordId];
      if (existing != null && existing != r.contentHash) {
        throw PersistenceException('duplicate recordId ${r.recordId} with different content');
      }
      _idToHash![r.recordId] = r.contentHash;
    }
  }

  @override
  Future<List<PersistenceRecord>> loadAll() async {
    final f = await _file();
    if (!await f.exists()) return <PersistenceRecord>[];
    final content = await f.readAsString(encoding: utf8);
    final lines = content.split('\n').where((s) => s.trim().isNotEmpty).toList();
    final list = <PersistenceRecord>[];
    for (final line in lines) {
      final json = jsonDecode(line) as Map<String, dynamic>;
      list.add(PersistenceRecord.fromJson(json));
    }
    return list;
  }

  @override
  Future<void> clearAll() async {
    final f = await _file();
    if (await f.exists()) await f.writeAsString('', encoding: utf8);
    _cache = <PersistenceRecord>[];
    _idToHash = <String, String>{};
  }
}
