// J8 — Immutable forensic audit package.

import 'package:iris_flutter_app/persistence/forensic/forensic_record.dart';
import 'package:iris_flutter_app/persistence/forensic/forensic_manifest.dart';
import 'package:iris_flutter_app/persistence/integrity/integrity_report.dart';
import 'package:iris_flutter_app/persistence/timetravel/replay_timeline.dart';

class ForensicPackage {
  const ForensicPackage({
    required this.executionId,
    required this.integrityReport,
    required this.replayTimeline,
    required this.records,
    required this.packageHash,
    required this.integrityValid,
    required this.replayDeterministic,
    required this.manifest,
  });

  final String executionId;
  final IntegrityReport integrityReport;
  final ReplayTimeline replayTimeline;
  final List<ForensicRecord> records;
  final String packageHash;
  final bool integrityValid;
  final bool replayDeterministic;
  final ForensicManifest manifest;
}
