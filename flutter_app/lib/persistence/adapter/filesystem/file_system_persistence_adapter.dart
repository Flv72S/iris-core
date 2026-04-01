// J4 — FileSystemPersistenceAdapter. Implements PersistencePort; file-based storage.

import 'dart:convert';
import 'dart:io';

import 'package:iris_flutter_app/persistence/canonical_parser.dart';
import 'package:iris_flutter_app/persistence/adapter/filesystem/persistence_exception.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_failure_event.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/model/persisted_guard_report.dart';
import 'package:iris_flutter_app/persistence/model/persisted_observability_event.dart';
import 'package:iris_flutter_app/persistence/port/event_store_port.dart';
import 'package:iris_flutter_app/persistence/port/execution_result_store_port.dart';
import 'package:iris_flutter_app/persistence/port/guard_report_store_port.dart';
import 'package:iris_flutter_app/persistence/integrity/get_raw_result.dart';
import 'package:iris_flutter_app/persistence/integrity/record_type.dart';
import 'package:iris_flutter_app/persistence/integrity/verifiable_persistence_port.dart';
import 'package:iris_flutter_app/persistence/port/persistence_port.dart';
import 'package:iris_flutter_app/persistence/port/snapshot_store_port.dart';
import 'package:iris_flutter_app/persistence/persisted_types.dart';

/// Record type names in file header.
const String _typeSnapshot = 'snapshot';
const String _typeResult = 'result';
const String _typeEvent = 'event';
const String _typeFailure = 'failure';
const String _typeGuard = 'guard';

/// File extension for record files.
const String _recordExt = '.record';

/// Implements PersistencePort and VerifiablePersistencePort (J5). Append-only; idempotent by hash.
class FileSystemPersistenceAdapter implements VerifiablePersistencePort {
  FileSystemPersistenceAdapter({
    required String baseDirectory,
    required DeterministicHashEngine hashEngine,
  })  : _basePath = baseDirectory,
        _hashEngine = hashEngine {
    _ensureDirectories();
  }

  final String _basePath;
  final DeterministicHashEngine _hashEngine;

  late final SnapshotStorePort _snapshotStore =
      _FileSystemSnapshotStore(this);
  late final EventStorePort _eventStore = _FileSystemEventStore(this);
  late final ExecutionResultStorePort _executionStore =
      _FileSystemExecutionResultStore(this);
  late final GuardReportStorePort _guardReportStore =
      _FileSystemGuardReportStore(this);

  @override
  SnapshotStorePort snapshotStore() => _snapshotStore;

  @override
  EventStorePort eventStore() => _eventStore;

  @override
  ExecutionResultStorePort executionStore() => _executionStore;

  @override
  GuardReportStorePort guardReportStore() => _guardReportStore;

  void _ensureDirectories() {
    try {
      for (final sub in ['snapshots', 'results', 'events', 'failures', 'guards']) {
        final dir = Directory('$_basePath/$sub');
        if (!dir.existsSync()) dir.createSync(recursive: true);
      }
    } on IOException catch (e) {
      throw PersistenceException('Failed to create directories: $_basePath', e);
    }
  }

  String _dir(String sub) => '$_basePath/$sub';

  /// Saves a record; idempotent (no overwrite if file exists).
  void saveRecord({
    required String subdir,
    required String type,
    required String hash,
    required String schemaVersion,
    required String canonicalBody,
  }) {
    final path = '${_dir(subdir)}/$hash$_recordExt';
    final file = File(path);
    if (file.existsSync()) return;
    try {
      final content = 'TYPE=$type\nHASH=$hash\nSCHEMA_VERSION=$schemaVersion\n---\n$canonicalBody';
      file.writeAsStringSync(content, encoding: utf8);
    } on IOException catch (e) {
      throw PersistenceException('Failed to write $path', e);
    }
  }

  /// Reads raw file content; returns null if file does not exist.
  (String type, String hash, String schemaVersion, String body)? readRecord(
    String subdir,
    String hash,
  ) {
    final path = '${_dir(subdir)}/$hash$_recordExt';
    final file = File(path);
    if (!file.existsSync()) return null;
    try {
      final content = file.readAsStringSync(encoding: utf8);
      final sep = content.indexOf('\n---\n');
      if (sep < 0) return null;
      final header = content.substring(0, sep);
      final body = content.substring(sep + 5);
      var type = '';
      var hashVal = '';
      var schemaVersion = '';
      for (final line in header.split('\n')) {
        if (line.startsWith('TYPE=')) type = line.substring(5).trim();
        if (line.startsWith('HASH=')) hashVal = line.substring(5).trim();
        if (line.startsWith('SCHEMA_VERSION=')) {
          schemaVersion = line.substring(15).trim();
        }
      }
      return (type, hashVal, schemaVersion, body);
    } on IOException catch (e) {
      throw PersistenceException('Failed to read $path', e);
    }
  }

  /// Lists hashes (file names without .record) in [subdir], sorted alphabetically.
  List<String> _listHashesInDir(String subdir) {
    final dir = Directory(_dir(subdir));
    if (!dir.existsSync()) return [];
    try {
      final files = dir
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith(_recordExt))
          .map((f) {
        final name = f.uri.pathSegments.last;
        return name.endsWith(_recordExt)
            ? name.substring(0, name.length - _recordExt.length)
            : name;
      })
          .toList();
      files.sort();
      return files;
    } on IOException catch (e) {
      throw PersistenceException('Failed to list $_dir(subdir)', e);
    }
  }

  static String _subdirFor(RecordType type) {
    switch (type) {
      case RecordType.snapshot: return 'snapshots';
      case RecordType.result: return 'results';
      case RecordType.event: return 'events';
      case RecordType.failure: return 'failures';
      case RecordType.guard: return 'guards';
    }
  }

  @override
  List<String> listHashes(RecordType type) => _listHashesInDir(_subdirFor(type));

  @override
  GetRawResult getRawRecord(RecordType type, String hashFromFilename) {
    final subdir = _subdirFor(type);
    final path = '${_dir(subdir)}/$hashFromFilename$_recordExt';
    final file = File(path);
    if (!file.existsSync()) return const GetRawMissing();
    try {
      final content = file.readAsStringSync(encoding: utf8);
      final sep = content.indexOf('\n---\n');
      if (sep < 0) return const GetRawCorrupted();
      final header = content.substring(0, sep);
      final body = content.substring(sep + 5);
      var hashFromContent = '';
      for (final line in header.split('\n')) {
        if (line.startsWith('HASH=')) {
          hashFromContent = line.substring(5).trim();
          break;
        }
      }
      if (hashFromContent.isEmpty) return const GetRawCorrupted();
      return GetRawSuccess(hashFromContent: hashFromContent, canonicalBody: body);
    } catch (_) {
      return const GetRawCorrupted();
    }
  }

  /// Deletes record by hash. Used by store delete(executionId) after resolving hash.
  void deleteRecord(String subdir, String hash) {
    final path = '${_dir(subdir)}/$hash$_recordExt';
    final file = File(path);
    if (file.existsSync()) {
      try {
        file.deleteSync();
      } on IOException catch (e) {
        throw PersistenceException('Failed to delete $path', e);
      }
    }
  }

  // --- Load by hash (adapter API) ---

  static final _snapshotTopKeys = {
    'executionId', 'governanceData', 'governanceHash', 'lifecycleData',
    'lifecycleHash', 'logicalTimestamp', 'schemaVersion',
  };
  static final _resultTopKeys = {
    'executionId', 'logicalTimestamp', 'resultData', 'resultHash', 'schemaVersion',
  };
  static final _eventTopKeys = {
    'eventHash', 'eventId', 'eventType', 'executionId', 'logicalTimestamp',
    'payload', 'schemaVersion',
  };
  static final _failureTopKeys = {
    'details', 'executionId', 'failureCode', 'failureHash', 'failureType',
    'logicalTimestamp', 'schemaVersion', 'severity',
  };
  static final _guardTopKeys = {
    'compliant', 'executionId', 'guardHash', 'logicalTimestamp',
    'schemaVersion', 'violations',
  };

  /// Canonical format does not distinguish string "1" from int 1; coerce for J2.
  static void _coerceStringKeys(Map<String, dynamic> map, Set<String> keys) {
    for (final k in keys) {
      final v = map[k];
      if (v is int || v is double) map[k] = v.toString();
    }
  }

  PersistedGovernanceSnapshot? loadSnapshot(String hash) {
    final r = readRecord('snapshots', hash);
    if (r == null) return null;
    final map = PersistenceCanonicalParser.parseToMap(r.$4, topLevelKeys: _snapshotTopKeys);
    _coerceStringKeys(map, {'executionId', 'schemaVersion', 'governanceHash', 'lifecycleHash'});
    return PersistedGovernanceSnapshot.fromMap(map);
  }

  PersistedExecutionResult? loadResult(String hash) {
    final r = readRecord('results', hash);
    if (r == null) return null;
    final map = PersistenceCanonicalParser.parseToMap(r.$4, topLevelKeys: _resultTopKeys);
    _coerceStringKeys(map, {'executionId', 'schemaVersion', 'resultHash'});
    return PersistedExecutionResult.fromMap(map);
  }

  PersistedObservabilityEvent? loadEvent(String hash) {
    final r = readRecord('events', hash);
    if (r == null) return null;
    final map = PersistenceCanonicalParser.parseToMap(r.$4, topLevelKeys: _eventTopKeys);
    _coerceStringKeys(map, {'executionId', 'eventId', 'eventType', 'eventHash', 'schemaVersion'});
    return PersistedObservabilityEvent.fromMap(map);
  }

  PersistedFailureEvent? loadFailure(String hash) {
    final r = readRecord('failures', hash);
    if (r == null) return null;
    final map = PersistenceCanonicalParser.parseToMap(r.$4, topLevelKeys: _failureTopKeys);
    _coerceStringKeys(map, {'executionId', 'failureCode', 'failureType', 'severity', 'failureHash', 'schemaVersion'});
    return PersistedFailureEvent.fromMap(map);
  }

  PersistedGuardReport? loadGuard(String hash) {
    final r = readRecord('guards', hash);
    if (r == null) return null;
    final map = PersistenceCanonicalParser.parseToMap(r.$4, topLevelKeys: _guardTopKeys);
    _coerceStringKeys(map, {'executionId', 'schemaVersion', 'guardHash'});
    return PersistedGuardReport.fromMap(map);
  }

  // --- List (adapter API) ---

  List<String> listSnapshots() => _listHashesInDir('snapshots');
  List<String> listResults() => _listHashesInDir('results');
  List<String> listEvents() => _listHashesInDir('events');
  List<String> listFailures() => _listHashesInDir('failures');
  List<String> listGuards() => _listHashesInDir('guards');

  /// Persist failure event (no port in J1; adapter-only).
  void saveFailure(PersistedFailureEvent event) {
    final hash = HashUtils.hashFailure(event, _hashEngine);
    final canonical = _hashEngine.toCanonicalString(event.toMap());
    saveRecord(
      subdir: 'failures',
      type: _typeFailure,
      hash: hash,
      schemaVersion: event.schemaVersion,
      canonicalBody: canonical,
    );
  }

  DeterministicHashEngine get hashEngine => _hashEngine;

  // --- Store implementations (by executionId) ---

  static const _snapshots = 'snapshots';
  static const _results = 'results';
  static const _events = 'events';
  static const _guards = 'guards';
}

class _FileSystemSnapshotStore implements SnapshotStorePort {
  _FileSystemSnapshotStore(this._adapter);
  final FileSystemPersistenceAdapter _adapter;

  @override
  Future<void> saveSnapshot(PersistedGovernanceSnapshot snapshot) async {
    final hash = HashUtils.hashSnapshot(snapshot, _adapter.hashEngine);
    final canonical =
        _adapter.hashEngine.toCanonicalString(snapshot.toMap());
    _adapter.saveRecord(
      subdir: FileSystemPersistenceAdapter._snapshots,
      type: _typeSnapshot,
      hash: hash,
      schemaVersion: snapshot.schemaVersion,
      canonicalBody: canonical,
    );
  }

  @override
  Future<PersistedGovernanceSnapshot?> getSnapshot(String executionId) async {
    for (final hash in _adapter.listSnapshots()) {
      final s = _adapter.loadSnapshot(hash);
      if (s != null && s.executionId == executionId) return s;
    }
    return null;
  }

  @override
  Future<bool> exists(String executionId) async {
    final s = await getSnapshot(executionId);
    return s != null;
  }

  @override
  Future<void> delete(String executionId) async {
    for (final hash in _adapter.listSnapshots()) {
      final s = _adapter.loadSnapshot(hash);
      if (s != null && s.executionId == executionId) {
        _adapter.deleteRecord(FileSystemPersistenceAdapter._snapshots, hash);
        return;
      }
    }
  }
}

class _FileSystemEventStore implements EventStorePort {
  _FileSystemEventStore(this._adapter);
  final FileSystemPersistenceAdapter _adapter;

  @override
  Future<void> appendEvent(PersistedObservabilityEvent event) async {
    final hash = HashUtils.hashEvent(event, _adapter.hashEngine);
    final canonical = _adapter.hashEngine.toCanonicalString(event.toMap());
    _adapter.saveRecord(
      subdir: FileSystemPersistenceAdapter._events,
      type: _typeEvent,
      hash: hash,
      schemaVersion: event.schemaVersion,
      canonicalBody: canonical,
    );
  }

  @override
  Future<List<PersistedObservabilityEvent>> getEvents(String executionId) async {
    final list = <PersistedObservabilityEvent>[];
    for (final hash in _adapter.listEvents()) {
      final e = _adapter.loadEvent(hash);
      if (e != null && e.executionId == executionId) list.add(e);
    }
    list.sort((a, b) => a.logicalTimestamp.compareTo(b.logicalTimestamp));
    return list;
  }

  @override
  Future<void> deleteEvents(String executionId) async {
    final toRemove = <String>[];
    for (final hash in _adapter.listEvents()) {
      final e = _adapter.loadEvent(hash);
      if (e != null && e.executionId == executionId) toRemove.add(hash);
    }
    for (final hash in toRemove) {
      _adapter.deleteRecord(FileSystemPersistenceAdapter._events, hash);
    }
  }
}

class _FileSystemExecutionResultStore implements ExecutionResultStorePort {
  _FileSystemExecutionResultStore(this._adapter);
  final FileSystemPersistenceAdapter _adapter;

  @override
  Future<void> saveResult(PersistedExecutionResult result) async {
    final hash = HashUtils.hashResult(result, _adapter.hashEngine);
    final canonical = _adapter.hashEngine.toCanonicalString(result.toMap());
    _adapter.saveRecord(
      subdir: FileSystemPersistenceAdapter._results,
      type: _typeResult,
      hash: hash,
      schemaVersion: result.schemaVersion,
      canonicalBody: canonical,
    );
  }

  @override
  Future<PersistedExecutionResult?> getResult(String executionId) async {
    for (final hash in _adapter.listResults()) {
      final r = _adapter.loadResult(hash);
      if (r != null && r.executionId == executionId) return r;
    }
    return null;
  }

  @override
  Future<void> delete(String executionId) async {
    for (final hash in _adapter.listResults()) {
      final r = _adapter.loadResult(hash);
      if (r != null && r.executionId == executionId) {
        _adapter.deleteRecord(FileSystemPersistenceAdapter._results, hash);
        return;
      }
    }
  }
}

class _FileSystemGuardReportStore implements GuardReportStorePort {
  _FileSystemGuardReportStore(this._adapter);
  final FileSystemPersistenceAdapter _adapter;

  @override
  Future<void> saveReport(PersistedGuardReport report) async {
    final hash = HashUtils.hashGuard(report, _adapter.hashEngine);
    final canonical = _adapter.hashEngine.toCanonicalString(report.toMap());
    _adapter.saveRecord(
      subdir: FileSystemPersistenceAdapter._guards,
      type: _typeGuard,
      hash: hash,
      schemaVersion: report.schemaVersion,
      canonicalBody: canonical,
    );
  }

  @override
  Future<PersistedGuardReport?> getReport(String executionId) async {
    for (final hash in _adapter.listGuards()) {
      final r = _adapter.loadGuard(hash);
      if (r != null && r.executionId == executionId) return r;
    }
    return null;
  }

  @override
  Future<void> delete(String executionId) async {
    for (final hash in _adapter.listGuards()) {
      final r = _adapter.loadGuard(hash);
      if (r != null && r.executionId == executionId) {
        _adapter.deleteRecord(FileSystemPersistenceAdapter._guards, hash);
        return;
      }
    }
  }
}
