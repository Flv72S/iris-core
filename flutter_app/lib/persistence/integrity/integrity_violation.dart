// J5 — Single integrity violation (immutable).

import 'package:iris_flutter_app/persistence/integrity/integrity_violation_type.dart';
import 'package:iris_flutter_app/persistence/integrity/record_type.dart';

/// Immutable description of one integrity violation.
class IntegrityViolation {
  const IntegrityViolation({
    required this.recordType,
    required this.hashFromFilename,
    required this.hashFromContent,
    required this.recomputedHash,
    required this.violationType,
    required this.details,
  });

  final RecordType recordType;
  final String hashFromFilename;
  final String hashFromContent;
  final String recomputedHash;
  final IntegrityViolationType violationType;
  final String details;
}
