// Phase 11.8.2 — Gate unlocked → isCertified true; locked → false; fields coherent.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_gate/certification_gate_state.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_evidence.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_section.dart';
import 'package:iris_flutter_app/ui/runtime_trust/runtime_trust_resolver.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';
import 'package:iris_flutter_app/ui/time_model/session_id.dart';
import 'package:iris_flutter_app/ui/time_model/time_context.dart';

CompliancePack _pack(String packHash, String bundleHash) {
  return CompliancePack(
    packVersion: '1.0.0',
    generatedFromBundleHash: bundleHash,
    generatedAtLogicalTime: const LogicalTime(tick: 2, origin: 'trace'),
    sections: const {
      'x': ComplianceSection(
        sectionId: 'x',
        title: 'X',
        description: 'X',
        evidence: [],
      ),
    },
    packHash: packHash,
  );
}

TimeContext _ctx(int tick, String sessionId) {
  return TimeContext(
    sessionId: SessionId(sessionId),
    currentTime: LogicalTime(tick: tick, origin: 'trace'),
  );
}

void main() {
  final resolver = RuntimeTrustResolver();

  test('gate open yields isCertified true and derived fields from pack and context', () {
    final state = resolver.resolve(
      gateState: CertificationGateState.open,
      pack: _pack('ph123', 'bh456'),
      timeContext: _ctx(3, 'session-2'),
    );
    expect(state.isCertified, true);
    expect(state.compliancePackHash, 'ph123');
    expect(state.forensicBundleHash, 'bh456');
    expect(state.logicalTick, 3);
    expect(state.sessionId, 'session-2');
  });

  test('gate closed yields isCertified false and empty pack-derived fields', () {
    final state = resolver.resolve(
      gateState: CertificationGateState.closedMissingBundle,
      pack: _pack('ph', 'bh'),
      timeContext: _ctx(1, 'session-0'),
    );
    expect(state.isCertified, false);
    expect(state.compliancePackHash, '');
    expect(state.forensicBundleHash, '');
    expect(state.logicalTick, 0);
    expect(state.sessionId, '');
  });
}
