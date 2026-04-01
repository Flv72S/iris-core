// Phase 11.7.1 — Deterministic pack generation. Evidence projection only; no interpretation.

import 'dart:convert';

import 'package:iris_flutter_app/bridge/mappers/hash_utils.dart';
import 'package:iris_flutter_app/ui/forensic_import/verified_forensic_bundle.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

import 'compliance_evidence.dart';
import 'compliance_pack.dart';
import 'compliance_section.dart';

const String _packVersion = '1.0.0';

class _ReadOnlyStore implements PersistenceStore {
  @override
  Future<void> append(PersistenceRecord record) async {}

  @override
  Future<List<PersistenceRecord>> loadAll() async => [];

  @override
  Future<void> clearAll() async {}
}

/// Builds CompliancePack from VerifiedForensicBundle. No logic; only mechanical projection.
class CompliancePackGenerator {
  CompliancePackGenerator() : _rehydrator = PersistenceRehydrator(store: _ReadOnlyStore());

  final PersistenceRehydrator _rehydrator;

  CompliancePack generate(VerifiedForensicBundle bundle) {
    final ctx = bundle.finalTimeContext;
    final logicalTimeStr = '${ctx.currentTime.tick}:${ctx.currentTime.origin}';
    final traceIds = <String>[];
    for (final r in bundle.bundle.records) {
      if (r is TraceRecord) traceIds.add(r.recordId);
    }
    final explanationSnapshot = jsonEncode(traceIds);
    final result = _rehydrator.rehydrateFromRecords(bundle.bundle.records);
    final navStack = TraceNavigationController(result.store).computeRouteStack();
    final navigationStackSnapshot = jsonEncode(navStack);

    final determinism = ComplianceSection(
      sectionId: 'determinism',
      title: 'Determinism',
      description: 'Evidence of deterministic store and bundle hash.',
      evidence: [
        ComplianceEvidence(storeHash: bundle.finalStoreHash),
        ComplianceEvidence(forensicBundleHash: bundle.verifiedHash),
      ],
    );
    final explainability = ComplianceSection(
      sectionId: 'explainability',
      title: 'Explainability',
      description: 'Trace IDs available for explanation.',
      evidence: [
        ComplianceEvidence(explanationSnapshot: explanationSnapshot),
      ],
    );
    final replayability = ComplianceSection(
      sectionId: 'replayability',
      title: 'Replayability',
      description: 'Bundle, store hash and navigation stack for replay.',
      evidence: [
        ComplianceEvidence(forensicBundleHash: bundle.verifiedHash),
        ComplianceEvidence(storeHash: bundle.finalStoreHash),
        ComplianceEvidence(navigationStackSnapshot: navigationStackSnapshot),
      ],
    );
    final auditTrail = ComplianceSection(
      sectionId: 'audit_trail',
      title: 'Audit Trail',
      description: 'Session and logical time.',
      evidence: [
        ComplianceEvidence(sessionId: bundle.sessionId, logicalTime: logicalTimeStr),
      ],
    );
    final timeSession = ComplianceSection(
      sectionId: 'time_session_integrity',
      title: 'Time & Session Integrity',
      description: 'Session and logical time integrity.',
      evidence: [
        ComplianceEvidence(sessionId: bundle.sessionId, logicalTime: logicalTimeStr),
        ComplianceEvidence(storeHash: bundle.finalStoreHash),
      ],
    );

    final sections = <String, ComplianceSection>{
      'determinism': determinism,
      'explainability': explainability,
      'replayability': replayability,
      'audit_trail': auditTrail,
      'time_session_integrity': timeSession,
    };

    final contentForHash = <String, dynamic>{
      'packVersion': _packVersion,
      'generatedFromBundleHash': bundle.verifiedHash,
      'generatedAtLogicalTime': <String, dynamic>{
        'tick': ctx.currentTime.tick,
        'origin': ctx.currentTime.origin,
      },
      'sections': sections.map((k, v) => MapEntry(k, v.toJson())),
    };
    final packHash = computeDeterministicHash(contentForHash);

    return CompliancePack(
      packVersion: _packVersion,
      generatedFromBundleHash: bundle.verifiedHash,
      generatedAtLogicalTime: ctx.currentTime,
      sections: sections,
      packHash: packHash,
    );
  }
}
