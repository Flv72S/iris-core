// G7 - UserTierBinding integrity; equality and serialization.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/meta_governance/extensions/media_governance/user_tier_binding.dart';

void main() {
  test('UserTierBinding equality and hashCode', () {
    const a = UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1');
    const b = UserTierBinding(tier: UserTier.free, mediaPolicyId: 'MEDIA_FREE_V1');
    final c = UserTierBinding(tier: UserTier.pro, mediaPolicyId: 'MEDIA_PRO_V1');
    expect(a, b);
    expect(a.hashCode, b.hashCode);
    expect(a, isNot(c));
  });

  test('UserTierBinding toJson', () {
    const binding = UserTierBinding(tier: UserTier.enterprise, mediaPolicyId: 'MEDIA_ENTERPRISE_V1');
    final json = binding.toJson();
    expect(json['tier'], 'enterprise');
    expect(json['mediaPolicyId'], 'MEDIA_ENTERPRISE_V1');
  });
}
