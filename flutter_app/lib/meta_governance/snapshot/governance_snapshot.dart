// H6 - Temporal governance snapshot. Immutable; structural memory only.

import 'package:iris_flutter_app/meta_governance/decision/governance_decision.dart';
import 'package:iris_flutter_app/meta_governance/decision/governance_ratification_record.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/gcp/gcp_descriptor.dart';
import 'package:iris_flutter_app/meta_governance/versioning/governance_version.dart';

/// Immutable DTO: state of governance at a point in time (at activation).
/// No mutable references; deterministic equality.
class GovernanceSnapshot {
  GovernanceSnapshot({
    required this.version,
    required this.capturedAt,
    required this.source,
    required List<GCPDescriptor> activeProposals,
    required List<GovernanceDecision> activeDecisions,
    required Map<String, String> activePolicies,
    List<String>? activeMediaPolicyIds,
    List<UserTierBinding>? activeTierBindings,
  })  : activeProposals = List.unmodifiable(List.from(activeProposals)),
        activeDecisions = List.unmodifiable(List.from(activeDecisions)),
        activePolicies = Map.unmodifiable(Map<String, String>.from(activePolicies)),
        activeMediaPolicyIds = List.unmodifiable(List.from(activeMediaPolicyIds ?? [])),
        activeTierBindings = _sortedTierBindings(activeTierBindings ?? const []);

  static List<UserTierBinding> _sortedTierBindings(List<UserTierBinding> list) {
    final copy = List<UserTierBinding>.from(list);
    copy.sort(UserTierBinding.compare);
    return List.unmodifiable(copy);
  }

  final GovernanceVersion version;
  final DateTime capturedAt;
  final GovernanceRatificationRecord source;
  final List<GCPDescriptor> activeProposals;
  final List<GovernanceDecision> activeDecisions;
  final Map<String, String> activePolicies;
  final List<String> activeMediaPolicyIds;
  final List<UserTierBinding> activeTierBindings;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceSnapshot &&
          version == other.version &&
          capturedAt == other.capturedAt &&
          source == other.source &&
          _listEqGcp(activeProposals, other.activeProposals) &&
          _listEqDecision(activeDecisions, other.activeDecisions) &&
          _mapEq(activePolicies, other.activePolicies) &&
          _listEqString(activeMediaPolicyIds, other.activeMediaPolicyIds) &&
          _listEqTierBinding(activeTierBindings, other.activeTierBindings));

  static bool _listEqString(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  static bool _listEqGcp(List<GCPDescriptor> a, List<GCPDescriptor> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  static bool _listEqDecision(List<GovernanceDecision> a, List<GovernanceDecision> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  static bool _listEqTierBinding(List<UserTierBinding> a, List<UserTierBinding> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  static bool _mapEq(Map<String, String> a, Map<String, String> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) if (a[k] != b[k]) return false;
    return true;
  }

  @override
  int get hashCode {
    final keys = activePolicies.keys.toList()..sort();
    final policyHash = Object.hashAll(
      keys.map((k) => Object.hash(k, activePolicies[k])),
    );
    return Object.hash(
      version,
      capturedAt,
      source,
      Object.hashAll(activeProposals),
      Object.hashAll(activeDecisions),
      policyHash,
      Object.hashAll(activeMediaPolicyIds),
      Object.hashAll(activeTierBindings),
    );
  }

  Map<String, Object> toJson() => {
        'version': version.toString(),
        'capturedAt': capturedAt.toUtc().toIso8601String(),
        'sourceGcpId': source.decision.gcpId.value,
        'activeProposalsCount': activeProposals.length,
        'activeDecisionsCount': activeDecisions.length,
        'activePoliciesCount': activePolicies.length,
        'activeMediaPolicyIdsCount': activeMediaPolicyIds.length,
        'activeTierBindingsCount': activeTierBindings.length,
      };
}
