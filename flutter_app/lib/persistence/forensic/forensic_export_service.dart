// J8 — Forensic Export & Audit Package Generator. Read-only; deterministic.

import 'dart:convert';
import 'dart:io';

import 'package:iris_flutter_app/persistence/forensic/forensic_manifest.dart';
import 'package:iris_flutter_app/persistence/forensic/forensic_package.dart';
import 'package:iris_flutter_app/persistence/forensic/forensic_record.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/hash/hash_utils.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_report.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_verifier.dart';
import 'package:iris_flutter_app/persistence/port/persistence_port.dart';
import 'package:iris_flutter_app/persistence/timetravel/replay_timeline.dart';
import 'package:iris_flutter_app/persistence/timetravel/time_travel_engine.dart';

/// Generates deterministic forensic audit packages. No modification of originals.
class ForensicExportService {
  ForensicExportService({
    required PersistencePort persistencePort,
    required DeterministicHashEngine hashEngine,
    required IntegrityVerifier integrityVerifier,
    required TimeTravelEngine timeTravelEngine,
  })  : _port = persistencePort,
        _engine = hashEngine,
        _integrityVerifier = integrityVerifier,
        _timeTravelEngine = timeTravelEngine;

  final PersistencePort _port;
  final DeterministicHashEngine _engine;
  final IntegrityVerifier _integrityVerifier;
  final TimeTravelEngine _timeTravelEngine;

  /// Generates an immutable forensic package for [executionId]. No disk write to existing records.
  Future<ForensicPackage> generatePackage(String executionId) async {
    final report = _integrityVerifier.verifyAll();
    final timeline = await _timeTravelEngine.buildTimeline(executionId);

    final snapshot = await _port.snapshotStore().getSnapshot(executionId);
    final result = await _port.executionStore().getResult(executionId);
    final events = await _port.eventStore().getEvents(executionId);
    final guard = await _port.guardReportStore().getReport(executionId);

    final records = <ForensicRecord>[];
    if (snapshot != null) {
      records.add(ForensicRecord(
        recordType: 'snapshot',
        recordHash: HashUtils.hashSnapshot(snapshot, _engine),
        schemaVersion: snapshot.schemaVersion,
        canonicalContent: _engine.toCanonicalString(snapshot.toMap()),
      ));
    }
    if (result != null) {
      records.add(ForensicRecord(
        recordType: 'result',
        recordHash: HashUtils.hashResult(result, _engine),
        schemaVersion: result.schemaVersion,
        canonicalContent: _engine.toCanonicalString(result.toMap()),
      ));
    }
    for (final event in events) {
      records.add(ForensicRecord(
        recordType: 'event',
        recordHash: HashUtils.hashEvent(event, _engine),
        schemaVersion: event.schemaVersion,
        canonicalContent: _engine.toCanonicalString(event.toMap()),
      ));
    }
    if (guard != null) {
      records.add(ForensicRecord(
        recordType: 'guard',
        recordHash: HashUtils.hashGuard(guard, _engine),
        schemaVersion: guard.schemaVersion,
        canonicalContent: _engine.toCanonicalString(guard.toMap()),
      ));
    }

    records.sort((a, b) {
      final typeOrder = _typeOrder(a.recordType).compareTo(_typeOrder(b.recordType));
      if (typeOrder != 0) return typeOrder;
      return a.recordHash.compareTo(b.recordHash);
    });

    final recordHashes = records.map((r) => r.recordHash).toList();
    final integrityValid = report.violations.isEmpty;
    final replayDeterministic = timeline.deterministic;

    final manifestHash = _engine.hash({
      'executionId': executionId,
      'totalRecords': records.length,
      'recordHashes': recordHashes.join('\n'),
      'integrityStatus': integrityValid,
      'replayStatus': replayDeterministic,
    });

    final packageHash = _engine.hashString(manifestHash + recordHashes.join(''));

    final manifest = ForensicManifest(
      executionId: executionId,
      totalRecords: records.length,
      recordHashes: List.unmodifiable(recordHashes),
      integrityStatus: integrityValid,
      replayStatus: replayDeterministic,
      manifestHash: manifestHash,
    );

    return ForensicPackage(
      executionId: executionId,
      integrityReport: report,
      replayTimeline: timeline,
      records: List.unmodifiable(records),
      packageHash: packageHash,
      integrityValid: integrityValid,
      replayDeterministic: replayDeterministic,
      manifest: manifest,
    );
  }

  static int _typeOrder(String t) {
    switch (t) {
      case 'snapshot': return 0;
      case 'result': return 1;
      case 'event': return 2;
      case 'guard': return 3;
      default: return 4;
    }
  }

  /// Exports package to [targetDirectory]. Creates manifest.txt and records/<hash>.record. Deterministic; UTF-8.
  Future<void> exportToDirectory(String executionId, String targetDirectory) async {
    final pkg = await generatePackage(executionId);
    _ensureDir(targetDirectory);
    final recordsDir = _ensureDir('$targetDirectory/records');

    final manifestLines = <String>[
      'EXECUTION_ID=${pkg.executionId}',
      'INTEGRITY_VALID=${pkg.integrityValid}',
      'REPLAY_DETERMINISTIC=${pkg.replayDeterministic}',
      'TOTAL_RECORDS=${pkg.records.length}',
      'RECORD_HASHES=',
      ...pkg.manifest.recordHashes,
      'MANIFEST_HASH=${pkg.manifest.manifestHash}',
      'PACKAGE_HASH=${pkg.packageHash}',
    ];
    final manifestPath = '$targetDirectory/manifest.txt';
    File(manifestPath).writeAsStringSync(manifestLines.join('\n'), encoding: _utf8);

    for (final rec in pkg.records) {
      final path = '$recordsDir/${rec.recordHash}.record';
      final content = 'TYPE=${rec.recordType}\nHASH=${rec.recordHash}\nSCHEMA_VERSION=${rec.schemaVersion}\n---\n${rec.canonicalContent}';
      File(path).writeAsStringSync(content, encoding: _utf8);
    }
  }

  static const _utf8 = Utf8Codec();

  static String _ensureDir(String path) {
    final d = Directory(path);
    if (!d.existsSync()) d.createSync(recursive: true);
    return path;
  }
}
