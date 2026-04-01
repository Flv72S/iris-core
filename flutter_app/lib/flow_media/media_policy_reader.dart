// F-Media — Read-only snapshot reader for media policies. No inference; no fallback.

import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';
import 'package:iris_flutter_app/meta_governance/snapshot/governance_snapshot.dart';

/// Reads media policy data from a governance snapshot.
/// Pure read-only; no inference; no fallback logic.
class MediaPolicyReader {
  const MediaPolicyReader(this.snapshot);

  final GovernanceSnapshot snapshot;

  /// Returns the list of active media policy IDs from the snapshot.
  /// Empty list if none are active.
  List<String> getActiveMediaPolicyIds() {
    return snapshot.activeMediaPolicyIds;
  }

  /// Returns the tier binding for the given tier, or null if not found.
  /// No inference; no fallback.
  UserTierBinding? bindingForTier(UserTier tier) {
    for (final binding in snapshot.activeTierBindings) {
      if (binding.tier == tier) {
        return binding;
      }
    }
    return null;
  }

  /// Returns true if the given policy ID is active in the snapshot.
  bool isPolicyActive(String policyId) {
    return snapshot.activeMediaPolicyIds.contains(policyId);
  }
}
