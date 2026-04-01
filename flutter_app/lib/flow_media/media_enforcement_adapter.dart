// F-Media — Enforcement adapter. Mechanical application of policy; no inference.

import 'package:iris_flutter_app/meta_governance/extensions/media_governance/storage_mode.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

import 'media_enforcement_decision.dart';
import 'media_policy_lookup.dart';
import 'media_policy_reader.dart';
import 'media_reference.dart';

/// Adapter that produces enforcement decisions by combining:
/// - MediaReference (the media being evaluated)
/// - UserTier (the user's tier)
/// - GovernanceSnapshot (via MediaPolicyReader)
/// - MediaPolicyLookup (to resolve policy ID to policy)
///
/// Pure; no IO; no inference; no normative judgment.
class MediaEnforcementAdapter {
  const MediaEnforcementAdapter({
    required this.policyReader,
    required this.policyLookup,
  });

  final MediaPolicyReader policyReader;
  final MediaPolicyLookup policyLookup;

  /// Evaluates what operations are allowed for the given media and user tier.
  /// Returns restrictive decision if policy cannot be resolved.
  MediaEnforcementDecision evaluate({
    required MediaReference media,
    required UserTier userTier,
  }) {
    final binding = policyReader.bindingForTier(userTier);
    if (binding == null) {
      return MediaEnforcementDecision.restrictive;
    }

    final policyId = binding.mediaPolicyId;
    if (!policyReader.isPolicyActive(policyId)) {
      return MediaEnforcementDecision.restrictive;
    }

    final policy = policyLookup.getPolicy(policyId);
    if (policy == null) {
      return MediaEnforcementDecision.restrictive;
    }

    final maxBytes = policy.maxFileSizeMB * 1024 * 1024;
    final sizeAllowed = media.sizeBytes <= maxBytes;

    final localOnly = policy.storageMode == StorageMode.deviceOnly;
    final cloudAllowed = policy.storageMode == StorageMode.cloud ||
        policy.storageMode == StorageMode.tiered;

    return MediaEnforcementDecision(
      uploadAllowed: sizeAllowed,
      localOnly: localOnly,
      cloudAllowed: cloudAllowed,
      compressionRequired: policy.compressionRequired,
      coldArchiveAllowed: policy.coldArchiveEnabled,
      multiDeviceSyncAllowed: policy.multiDeviceSync,
      maxFileSizeBytes: maxBytes,
    );
  }
}
