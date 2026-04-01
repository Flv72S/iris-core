// H1 - When to bump MAJOR / MINOR / PATCH. Declarative only.

import 'governance_version.dart';

/// Declarative rules for governance version increments. Not executable.
class GovernanceVersionPolicy {
  GovernanceVersionPolicy._();

  /// Increment MAJOR when: structural change to rules, new scope, new role, authority change.
  static const majorReasons = [
    'Structural change to governance rules',
    'New meta-governance scope',
    'New role or removal of role',
    'Change to authority matrix',
  ];

  /// Increment MINOR when: extension without breaking (new policy, new allowed action).
  static const minorReasons = [
    'New policy or rule extension',
    'New allowed action for a role',
    'Backward-compatible clarification',
  ];

  /// Increment PATCH when: non-semantic correction (typos, wording).
  static const patchReasons = [
    'Documentation or wording fix',
    'Non-semantic correction',
  ];

  static GovernanceVersion nextMajor(GovernanceVersion current) =>
      GovernanceVersion(major: current.major + 1, minor: 0, patch: 0);

  static GovernanceVersion nextMinor(GovernanceVersion current) =>
      GovernanceVersion(
          major: current.major, minor: current.minor + 1, patch: 0);

  static GovernanceVersion nextPatch(GovernanceVersion current) =>
      GovernanceVersion(
          major: current.major,
          minor: current.minor,
          patch: current.patch + 1);
}
