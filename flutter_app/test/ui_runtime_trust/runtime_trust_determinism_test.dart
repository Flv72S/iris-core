// Phase 11.8.2 — Same inputs → same RuntimeTrustState; hashCode equality.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_state.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_evidence.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_section.dart';
import 'package:iris_flutter_app/ui/runtime_trust/runtime_trust_resolver.dart';
import 'package:iris_flutter_app/ui/runtime_trust/runtime_trust_state.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';
import 'package:iris_flutter_app/ui/time_model/session_id.dart';
import 'package:iris_flutter_app/ui/time_model/time_context.dart';

CompliancePack _makePack({String packHash = 'aa', String bundleHash = 'bb'}) {
  return CompliancePack(
    packVersion: '1.0.0',
    generatedFromBundleHash: bundleHash,
    generatedAtLogicalTime: const LogicalTime(tick: 1, origin: 'trace'),
    sections: {
      'd': const ComplianceSection(
        sectionId: 'd',
        title: 'D',
        description: 'D',
        evidence: [],
      ),
    },
    packHash: packHash,
  );
}

TimeContext _makeContext({int tick = 1, String sessionId = 'session-1'}) {
  return TimeContext(
    sessionId: SessionId(sessionId),
    currentTime: LogicalTime(tick: tick, origin: 'trace'),
  );
}

void main() {
  test('same inputs yield identical RuntimeTrustState and hashCode', () {
    final resolver = RuntimeTrustResolver();
    final pack = _makePack();
    final ctx = _makeContext();

    final a = resolver.resolve(
      gateState: CertificationGateState.open,
      pack: pack,
      timeContext: ctx,
    );
    final b = resolver.resolve(
      gateState: CertificationGateState.open,
      pack: pack,
      timeContext: ctx,
    );

    expect(a, b);
    expect(a.hashCode, b.hashCode);
    expect(a.isCertified, true);
    expect(a.compliancePackHash, 'aa');
    expect(a.forensicBundleHash, 'bb');
    expect(a.logicalTick, 1);
    expect(a.sessionId, 'session-1');
  });
}
