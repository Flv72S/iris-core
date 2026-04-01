// ODA-8 — Formal certification report. Replay-identical.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class CertificationReport {
  const CertificationReport({
    required this.systemIntegrityHash,
    required this.governanceHash,
    required this.economicHash,
    required this.federationHash,
    required this.complianceHash,
    required this.invariantResults,
    required this.violationFlags,
    required this.certificationStatus,
    required this.signatures,
    required this.reportHash,
  });

  final String systemIntegrityHash;
  final String governanceHash;
  final String economicHash;
  final String federationHash;
  final String complianceHash;
  final Map<String, bool> invariantResults;
  final Map<String, bool> violationFlags;
  final bool certificationStatus;
  final List<String> signatures;
  final String reportHash;
}

class CertificationReportGenerator {
  CertificationReportGenerator._();

  static CertificationReport generateCertificationReport({
    required String systemIntegrityHash,
    required String governanceHash,
    required String economicHash,
    required String federationHash,
    required String complianceHash,
    required Map<String, bool> invariantResults,
    required Map<String, bool> violationFlags,
    required List<String> signatures,
  }) {
    final status = violationFlags.values.every((v) => !v);
    final payload = <String, dynamic>{
      'systemIntegrityHash': systemIntegrityHash,
      'governanceHash': governanceHash,
      'economicHash': economicHash,
      'federationHash': federationHash,
      'complianceHash': complianceHash,
      'invariantResults': invariantResults,
      'violationFlags': violationFlags,
      'certificationStatus': status,
    };
    final reportHash = CanonicalPayload.hash(payload);
    return CertificationReport(
      systemIntegrityHash: systemIntegrityHash,
      governanceHash: governanceHash,
      economicHash: economicHash,
      federationHash: federationHash,
      complianceHash: complianceHash,
      invariantResults: invariantResults,
      violationFlags: violationFlags,
      certificationStatus: status,
      signatures: signatures,
      reportHash: reportHash,
    );
  }

  static bool verifyCertificationReport(
    CertificationReport report,
    bool Function(String reportHash, List<String> signatures) verifySignatures,
  ) {
    final expected = CanonicalPayload.hash(<String, dynamic>{
      'systemIntegrityHash': report.systemIntegrityHash,
      'governanceHash': report.governanceHash,
      'economicHash': report.economicHash,
      'federationHash': report.federationHash,
      'complianceHash': report.complianceHash,
      'invariantResults': report.invariantResults,
      'violationFlags': report.violationFlags,
      'certificationStatus': report.certificationStatus,
    });
    return report.reportHash == expected && verifySignatures(report.reportHash, report.signatures);
  }
}
