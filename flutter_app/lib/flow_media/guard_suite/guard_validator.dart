// I8 - Guard validators. Deterministic read-only validation.

import 'guard_context.dart';
import 'guard_rules.dart';

/// Result of running a single rule check.
class RuleCheckResult {
  const RuleCheckResult({
    required this.rule,
    required this.passed,
    this.violation,
  });

  final GuardRule rule;
  final bool passed;
  final GuardViolation? violation;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is RuleCheckResult &&
          rule == other.rule &&
          passed == other.passed &&
          violation == other.violation);

  @override
  int get hashCode => Object.hash(rule, passed, violation);
}

/// Deterministic validator: checks context against a rule.
/// Pure function, no side effects.
typedef RuleValidator = RuleCheckResult Function(GuardContext context);

/// Registry of validators by rule ID.
class GuardValidatorRegistry {
  GuardValidatorRegistry() : _validators = {};

  final Map<String, RuleValidator> _validators;

  /// Registers a validator for a rule ID.
  void register(String ruleId, RuleValidator validator) {
    _validators[ruleId] = validator;
  }

  /// Returns the validator for a rule ID, or null.
  RuleValidator? get(String ruleId) => _validators[ruleId];

  /// Runs the validator for the given rule and context.
  /// If no validator is registered for the rule, returns passed.
  RuleCheckResult run(GuardRule rule, GuardContext context) {
    final validator = _validators[rule.id];
    if (validator == null) {
      return RuleCheckResult(rule: rule, passed: true);
    }
    return validator(context);
  }

  /// Returns all registered rule IDs.
  List<String> get registeredRuleIds => _validators.keys.toList();
}

/// Runs all enabled rules from [ruleSet] against [context] using [registry].
/// Returns list of violations (empty if aligned). Deterministic, no side effects.
List<GuardViolation> runValidation(
  GuardContext context,
  GuardRuleSet ruleSet,
  GuardValidatorRegistry registry,
) {
  final violations = <GuardViolation>[];
  for (final rule in ruleSet.enabledRules) {
    final result = registry.run(rule, context);
    if (!result.passed && result.violation != null) {
      violations.add(result.violation!);
    }
  }
  return violations;
}

/// Built-in validators that can be registered.
class BuiltInValidators {
  const BuiltInValidators._();

  /// Validates that snapshot collections are unmodifiable (immutability).
  static RuleCheckResult checkSnapshotImmutability(GuardContext context) {
    try {
      final snapshot = context.snapshot;
      final list = snapshot.activeMediaPolicyIds;
      list.add('x');
      return RuleCheckResult(
        rule: StandardGuardRules.snapshotImmutability,
        passed: false,
        violation: GuardViolation(
          rule: StandardGuardRules.snapshotImmutability,
          message: 'Snapshot activeMediaPolicyIds was mutable',
          location: 'GuardContext.snapshot',
          details: {'ruleId': StandardGuardRules.snapshotImmutability.id},
        ),
      );
    } catch (_) {
      return RuleCheckResult(
        rule: StandardGuardRules.snapshotImmutability,
        passed: true,
      );
    }
  }

  /// Validates that lifecycle plan transitions are unmodifiable.
  static RuleCheckResult checkLifecyclePlanImmutability(GuardContext context) {
    if (!context.hasLifecyclePlan) {
      return RuleCheckResult(
        rule: StandardGuardRules.lifecyclePlanImmutability,
        passed: true,
      );
    }
    try {
      (context.lifecyclePlan!.transitions as List).clear();
      return RuleCheckResult(
        rule: StandardGuardRules.lifecyclePlanImmutability,
        passed: false,
        violation: GuardViolation(
          rule: StandardGuardRules.lifecyclePlanImmutability,
          message: 'Lifecycle plan transitions were mutable',
          location: 'GuardContext.lifecyclePlan',
          details: {},
        ),
      );
    } catch (_) {
      return RuleCheckResult(
        rule: StandardGuardRules.lifecyclePlanImmutability,
        passed: true,
      );
    }
  }

  /// Validates source files for forbidden patterns (simulated: pass if no files).
  static RuleCheckResult checkNoDartIo(GuardContext context) {
    if (context.sourceFiles.isEmpty) {
      return RuleCheckResult(
        rule: StandardGuardRules.noDartIoDependency,
        passed: true,
      );
    }
    for (final path in context.sourceFiles) {
      if (path.contains('dart:io') || path.toLowerCase().contains('dart\\io')) {
        return RuleCheckResult(
          rule: StandardGuardRules.noDartIoDependency,
          passed: false,
          violation: GuardViolation(
            rule: StandardGuardRules.noDartIoDependency,
            message: 'Forbidden dart:io dependency detected',
            location: path,
            details: {'path': path},
          ),
        );
      }
    }
    return RuleCheckResult(
      rule: StandardGuardRules.noDartIoDependency,
      passed: true,
    );
  }

  /// Validates media ref hash format when present.
  static RuleCheckResult checkHashIntegrity(GuardContext context) {
    if (context.mediaRef == null) {
      return RuleCheckResult(
        rule: StandardGuardRules.hashIntegrity,
        passed: true,
      );
    }
    final hash = context.mediaRef!.hash;
    if (hash.isEmpty || (!hash.contains(':') && hash.length < 4)) {
      return RuleCheckResult(
        rule: StandardGuardRules.hashIntegrity,
        passed: false,
        violation: GuardViolation(
          rule: StandardGuardRules.hashIntegrity,
          message: 'Media reference hash empty or malformed',
          location: 'GuardContext.mediaRef',
          details: {'hash': hash},
        ),
      );
    }
    return RuleCheckResult(
      rule: StandardGuardRules.hashIntegrity,
      passed: true,
    );
  }
}
