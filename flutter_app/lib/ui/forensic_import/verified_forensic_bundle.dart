// Phase 11.6.2 — Immutable DTO created only after full import verification.

import 'package:iris_flutter_app/ui/forensic_export/forensic_bundle.dart';
import 'package:iris_flutter_app/ui/time_model/time_context.dart';

/// Result of successful import and verification. Created only by ForensicBundleImporter.
class VerifiedForensicBundle {
  const VerifiedForensicBundle({
    required this.bundle,
    required this.verifiedHash,
    required this.recordCount,
    required this.sessionId,
    required this.finalTimeContext,
    required this.finalStoreHash,
  });

  final ForensicBundle bundle;
  final String verifiedHash;
  final int recordCount;
  final String sessionId;
  final TimeContext finalTimeContext;
  final String finalStoreHash;
}
