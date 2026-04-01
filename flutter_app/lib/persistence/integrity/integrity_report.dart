// J5 — Immutable integrity verification report.

import 'package:iris_flutter_app/persistence/integrity/integrity_violation.dart';

/// Immutable result of a full or partial integrity verification run.
class IntegrityReport {
  const IntegrityReport({
    required this.totalRecordsChecked,
    required this.validRecords,
    required this.corruptedRecords,
    required this.missingFiles,
    required this.mismatchedHash,
    required this.violations,
  });

  final int totalRecordsChecked;
  final int validRecords;
  final int corruptedRecords;
  final int missingFiles;
  final int mismatchedHash;
  final List<IntegrityViolation> violations;
}
