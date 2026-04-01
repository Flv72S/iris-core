// J5 — Integrity Verification Layer. Read-only; no file modification.

import 'package:iris_flutter_app/persistence/canonical_parser.dart';
import 'package:iris_flutter_app/persistence/hash/deterministic_hash_engine.dart';
import 'package:iris_flutter_app/persistence/integrity/get_raw_result.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_report.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_violation.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_violation_type.dart';
import 'package:iris_flutter_app/persistence/integrity/record_type.dart';
import 'package:iris_flutter_app/persistence/integrity/verifiable_persistence_port.dart';

/// Verifies integrity of persisted records: hash reconciliation and tamper detection.
/// Depends only on interfaces; read-only; no auto-repair.
class IntegrityVerifier {
  IntegrityVerifier({
    required VerifiablePersistencePort persistencePort,
    required DeterministicHashEngine hashEngine,
  })  : _port = persistencePort,
        _engine = hashEngine;

  final VerifiablePersistencePort _port;
  final DeterministicHashEngine _engine;

  static final _topKeys = {
    RecordType.snapshot: {
      'executionId', 'governanceData', 'governanceHash', 'lifecycleData',
      'lifecycleHash', 'logicalTimestamp', 'schemaVersion',
    },
    RecordType.result: {
      'executionId', 'logicalTimestamp', 'resultData', 'resultHash', 'schemaVersion',
    },
    RecordType.event: {
      'eventHash', 'eventId', 'eventType', 'executionId', 'logicalTimestamp',
      'payload', 'schemaVersion',
    },
    RecordType.failure: {
      'details', 'executionId', 'failureCode', 'failureHash', 'failureType',
      'logicalTimestamp', 'schemaVersion', 'severity',
    },
    RecordType.guard: {
      'compliant', 'executionId', 'guardHash', 'logicalTimestamp',
      'schemaVersion', 'violations',
    },
  };

  /// Runs verification on all record types; returns immutable report.
  IntegrityReport verifyAll() {
    var total = 0;
    var valid = 0;
    var corrupted = 0;
    var missing = 0;
    var mismatched = 0;
    final violations = <IntegrityViolation>[];

    for (final type in RecordType.values) {
      final result = _verifyType(type);
      total += result.totalRecordsChecked;
      valid += result.validRecords;
      corrupted += result.corruptedRecords;
      missing += result.missingFiles;
      mismatched += result.mismatchedHash;
      violations.addAll(result.violations);
    }

    return IntegrityReport(
      totalRecordsChecked: total,
      validRecords: valid,
      corruptedRecords: corrupted,
      missingFiles: missing,
      mismatchedHash: mismatched,
      violations: List.unmodifiable(violations),
    );
  }

  /// Runs verification on a single record type.
  IntegrityReport verifyByType(RecordType type) => _verifyType(type);

  IntegrityReport _verifyType(RecordType type) {
    var total = 0;
    var valid = 0;
    var corrupted = 0;
    var missing = 0;
    var mismatched = 0;
    final violations = <IntegrityViolation>[];

    final hashes = _port.listHashes(type);
    total = hashes.length;

    for (final hashFromFilename in hashes) {
      final result = _port.getRawRecord(type, hashFromFilename);

      switch (result) {
        case GetRawMissing():
          missing++;
          violations.add(IntegrityViolation(
            recordType: type,
            hashFromFilename: hashFromFilename,
            hashFromContent: '',
            recomputedHash: '',
            violationType: IntegrityViolationType.FILE_MISSING,
            details: 'File missing for hash $hashFromFilename',
          ));
          break;

        case GetRawCorrupted():
          corrupted++;
          violations.add(IntegrityViolation(
            recordType: type,
            hashFromFilename: hashFromFilename,
            hashFromContent: '',
            recomputedHash: '',
            violationType: IntegrityViolationType.CORRUPTED_FORMAT,
            details: 'Header missing or HASH absent; parse failed',
          ));
          break;

        case GetRawSuccess(:final hashFromContent, :final canonicalBody):
          String recomputedHash;
          try {
            final map = PersistenceCanonicalParser.parseToMap(
              canonicalBody,
              topLevelKeys: _topKeys[type],
            );
            recomputedHash = _engine.hash(Map<String, Object?>.from(map));
          } catch (_) {
            corrupted++;
            violations.add(IntegrityViolation(
              recordType: type,
              hashFromFilename: hashFromFilename,
              hashFromContent: hashFromContent,
              recomputedHash: '',
              violationType: IntegrityViolationType.CORRUPTED_FORMAT,
              details: 'Body parse failed',
            ));
            break;
          }

          var hasMismatch = false;
          if (hashFromFilename != hashFromContent) {
            hasMismatch = true;
            violations.add(IntegrityViolation(
              recordType: type,
              hashFromFilename: hashFromFilename,
              hashFromContent: hashFromContent,
              recomputedHash: recomputedHash,
              violationType: IntegrityViolationType.HASH_MISMATCH_FILENAME,
              details: 'Filename hash != content HASH',
            ));
          }
          if (hashFromFilename != recomputedHash) {
            hasMismatch = true;
            violations.add(IntegrityViolation(
              recordType: type,
              hashFromFilename: hashFromFilename,
              hashFromContent: hashFromContent,
              recomputedHash: recomputedHash,
              violationType: IntegrityViolationType.HASH_MISMATCH_RECOMPUTED,
              details: 'Filename hash != recomputed hash',
            ));
          }
          if (hashFromContent != recomputedHash) {
            hasMismatch = true;
            violations.add(IntegrityViolation(
              recordType: type,
              hashFromFilename: hashFromFilename,
              hashFromContent: hashFromContent,
              recomputedHash: recomputedHash,
              violationType: IntegrityViolationType.HASH_MISMATCH_CONTENT,
              details: 'Content HASH != recomputed hash',
            ));
          }
          if (hasMismatch) {
            mismatched++;
          } else {
            valid++;
          }
          break;
      }
    }

    return IntegrityReport(
      totalRecordsChecked: total,
      validRecords: valid,
      corruptedRecords: corrupted,
      missingFiles: missing,
      mismatchedHash: mismatched,
      violations: List.unmodifiable(violations),
    );
  }
}
