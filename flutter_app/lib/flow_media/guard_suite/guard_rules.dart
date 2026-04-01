// I8 - Architectural guard rules.

enum GuardRuleCategory {
  immutability,
  forbiddenDependency,
  unauthorizedChange,
  policyCompliance,
  dataIntegrity,
}

enum GuardRuleSeverity {
  info,
  warning,
  error,
  critical,
}

class GuardRule {
  const GuardRule({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.severity,
    this.enabled = true,
  });

  final String id;
  final String name;
  final String description;
  final GuardRuleCategory category;
  final GuardRuleSeverity severity;
  final bool enabled;

  GuardRule withEnabled(bool enabled) => GuardRule(
        id: id,
        name: name,
        description: description,
        category: category,
        severity: severity,
        enabled: enabled,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GuardRule &&
          id == other.id &&
          name == other.name &&
          category == other.category &&
          severity == other.severity &&
          enabled == other.enabled);

  @override
  int get hashCode => Object.hash(id, name, category, severity, enabled);

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'category': category.name,
        'severity': severity.name,
        'enabled': enabled,
      };

  @override
  String toString() => 'GuardRule($id: $name, $severity)';
}

class GuardViolation {
  const GuardViolation({
    required this.rule,
    required this.message,
    required this.location,
    this.details = const {},
  });

  final GuardRule rule;
  final String message;
  final String location;
  final Map<String, dynamic> details;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is GuardViolation &&
          rule == other.rule &&
          message == other.message &&
          location == other.location);

  @override
  int get hashCode => Object.hash(rule, message, location);

  Map<String, dynamic> toJson() => {
        'rule': rule.toJson(),
        'message': message,
        'location': location,
        'details': details,
      };

  @override
  String toString() => 'GuardViolation(${rule.id}: $message at $location)';
}

class StandardGuardRules {
  const StandardGuardRules._();

  static const snapshotImmutability = GuardRule(
    id: 'GUARD-001',
    name: 'Snapshot Immutability',
    description:
        'GovernanceSnapshot and its contents must not be modified after creation',
    category: GuardRuleCategory.immutability,
    severity: GuardRuleSeverity.critical,
  );

  static const lifecyclePlanImmutability = GuardRule(
    id: 'GUARD-002',
    name: 'Lifecycle Plan Immutability',
    description: 'MediaLifecyclePlan must not be modified after creation',
    category: GuardRuleCategory.immutability,
    severity: GuardRuleSeverity.critical,
  );

  static const registryNoDirectModification = GuardRule(
    id: 'GUARD-003',
    name: 'Registry Direct Modification',
    description: 'GovernanceRegistry must not be modified directly at runtime',
    category: GuardRuleCategory.unauthorizedChange,
    severity: GuardRuleSeverity.critical,
  );

  static const noUnauthorizedDowngrade = GuardRule(
    id: 'GUARD-004',
    name: 'Unauthorized Version Downgrade',
    description: 'Version downgrades must go through proper governance channels',
    category: GuardRuleCategory.unauthorizedChange,
    severity: GuardRuleSeverity.critical,
  );

  static const noDartIoDependency = GuardRule(
    id: 'GUARD-005',
    name: 'No dart:io Dependency',
    description: 'Media layer must not depend on dart:io directly',
    category: GuardRuleCategory.forbiddenDependency,
    severity: GuardRuleSeverity.error,
  );

  static const noCloudSdkDependency = GuardRule(
    id: 'GUARD-006',
    name: 'No Cloud SDK Dependency',
    description: 'Media layer must not depend on cloud SDKs directly',
    category: GuardRuleCategory.forbiddenDependency,
    severity: GuardRuleSeverity.error,
  );

  static const noDateTimeNow = GuardRule(
    id: 'GUARD-007',
    name: 'No Current-Time Usage',
    description: 'Media layer must not use real-time clock or current-time APIs for determinism',
    category: GuardRuleCategory.forbiddenDependency,
    severity: GuardRuleSeverity.error,
  );

  static const noRandomUsage = GuardRule(
    id: 'GUARD-008',
    name: 'No Non-Deterministic RNG',
    description: 'Media layer must not use non-deterministic RNG for determinism',
    category: GuardRuleCategory.forbiddenDependency,
    severity: GuardRuleSeverity.error,
  );

  static const enforcementPolicyCompliance = GuardRule(
    id: 'GUARD-009',
    name: 'Enforcement Policy Compliance',
    description: 'MediaEnforcementDecision must comply with active policies',
    category: GuardRuleCategory.policyCompliance,
    severity: GuardRuleSeverity.error,
  );

  static const hashIntegrity = GuardRule(
    id: 'GUARD-010',
    name: 'Hash Integrity',
    description: 'All hashes must be verifiable and well-formed',
    category: GuardRuleCategory.dataIntegrity,
    severity: GuardRuleSeverity.critical,
  );

  static List<GuardRule> get all => const [
        snapshotImmutability,
        lifecyclePlanImmutability,
        registryNoDirectModification,
        noUnauthorizedDowngrade,
        noDartIoDependency,
        noCloudSdkDependency,
        noDateTimeNow,
        noRandomUsage,
        enforcementPolicyCompliance,
        hashIntegrity,
      ];

  static List<GuardRule> get enabled => all.where((r) => r.enabled).toList();

  static List<GuardRule> ofCategory(GuardRuleCategory category) =>
      all.where((r) => r.category == category).toList();

  static List<GuardRule> ofSeverityOrHigher(GuardRuleSeverity minSeverity) =>
      all.where((r) => r.severity.index >= minSeverity.index).toList();
}

class GuardRuleSet {
  GuardRuleSet({List<GuardRule>? rules})
      : _rules = Map.fromEntries(
          (rules ?? StandardGuardRules.all).map((r) => MapEntry(r.id, r)),
        );

  final Map<String, GuardRule> _rules;

  List<GuardRule> get rules => _rules.values.toList();

  List<GuardRule> get enabledRules =>
      _rules.values.where((r) => r.enabled).toList();

  GuardRule? getRule(String id) => _rules[id];

  void enableRule(String id) {
    final rule = _rules[id];
    if (rule != null) _rules[id] = rule.withEnabled(true);
  }

  void disableRule(String id) {
    final rule = _rules[id];
    if (rule != null) _rules[id] = rule.withEnabled(false);
  }

  void addRule(GuardRule rule) {
    _rules[rule.id] = rule;
  }

  void removeRule(String id) {
    _rules.remove(id);
  }

  bool isEnabled(String id) => _rules[id]?.enabled ?? false;
}
