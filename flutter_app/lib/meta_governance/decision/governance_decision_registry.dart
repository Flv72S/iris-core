// H4 - Registry of decisions. Read-only list; used by H6 snapshot builder.

import 'package:iris_flutter_app/meta_governance/gcp/gcp_id.dart';

import 'governance_decision.dart';

class GovernanceDecisionRegistry {
  GovernanceDecisionRegistry([List<GovernanceDecision>? initial])
      : _list = List.from(initial ?? []);

  final List<GovernanceDecision> _list;

  void register(GovernanceDecision decision) {
    _list.add(decision);
  }

  GovernanceDecision? getByGcpId(GCPId id) {
    for (final d in _list) {
      if (d.gcpId == id) return d;
    }
    return null;
  }

  List<GovernanceDecision> listAll() => List.unmodifiable(_list);
}
