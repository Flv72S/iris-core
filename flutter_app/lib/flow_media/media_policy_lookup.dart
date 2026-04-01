// F-Media — Policy lookup interface. Read-only; no side effects.

import 'package:iris_flutter_app/meta_governance/extensions/media_governance/media_storage_policy.dart';

/// Interface for resolving policy ID to MediaStoragePolicy.
/// Implementation injected; no IO; no side effects.
abstract interface class MediaPolicyLookup {
  /// Returns the policy for the given ID, or null if not found.
  MediaStoragePolicy? getPolicy(String policyId);
}

/// In-memory implementation backed by a map.
class InMemoryMediaPolicyLookup implements MediaPolicyLookup {
  const InMemoryMediaPolicyLookup(this._policies);

  final Map<String, MediaStoragePolicy> _policies;

  @override
  MediaStoragePolicy? getPolicy(String policyId) => _policies[policyId];
}
