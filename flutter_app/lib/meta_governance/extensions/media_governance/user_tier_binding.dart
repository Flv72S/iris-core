// G7 - Tier-to-policy binding. Versionable; ratifiable via GCP; metadata only.

enum UserTier {
  free,
  pro,
  enterprise,
}

class UserTierBinding {
  const UserTierBinding({
    required this.tier,
    required this.mediaPolicyId,
  });

  final UserTier tier;
  final String mediaPolicyId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is UserTierBinding &&
          tier == other.tier &&
          mediaPolicyId == other.mediaPolicyId);

  @override
  int get hashCode => Object.hash(tier, mediaPolicyId);

  Map<String, Object> toJson() => {
        'tier': tier.name,
        'mediaPolicyId': mediaPolicyId,
      };

  /// Ordine deterministico: prima tier (free < pro < enterprise), poi mediaPolicyId.
  static int compare(UserTierBinding a, UserTierBinding b) {
    final tierCmp = a.tier.index.compareTo(b.tier.index);
    if (tierCmp != 0) return tierCmp;
    return a.mediaPolicyId.compareTo(b.mediaPolicyId);
  }
}
