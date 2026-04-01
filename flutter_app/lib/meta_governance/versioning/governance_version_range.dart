// H1 - Version range. Min <= max; contains(v).

import 'governance_version.dart';

class GovernanceVersionRangeException implements Exception {
  GovernanceVersionRangeException(this.message);
  final String message;
  @override
  String toString() => 'GovernanceVersionRangeException: $message';
}

class GovernanceVersionRange {
  GovernanceVersionRange({required this.min, required this.max}) {
    if (GovernanceVersion.compare(min, max) > 0) {
      throw GovernanceVersionRangeException('min must be <= max');
    }
  }

  final GovernanceVersion min;
  final GovernanceVersion max;

  bool contains(GovernanceVersion v) {
    return GovernanceVersion.compare(v, min) >= 0 &&
        GovernanceVersion.compare(v, max) <= 0;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GovernanceVersionRange && min == other.min && max == other.max);

  @override
  int get hashCode => Object.hash(min, max);
}
