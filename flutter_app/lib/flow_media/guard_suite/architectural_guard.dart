// I8 - Architectural Guard Suite. Main entry point.

import 'guard_context.dart';
import 'guard_logger.dart';
import 'guard_rules.dart';
import 'guard_validator.dart';

/// Result of running the full guard suite.
class GuardReport {
  const GuardReport({
    required this.record,
    required this.context,
  });

  final GuardRunRecord record;
  final GuardContext context;

  /// True if no violations.
  bool get passed => record.passed;

  /// Violations found.
  List<GuardViolation> get violations => record.violations;

  /// Run hash for audit.
  String get runHash => record.runHash;

  Map<String, dynamic> toJson() => {
        'record': record.toJson(),
        'contextSummary': context.toJson(),
      };

  String toJsonString() => record.toJsonString();
}

/// Runs the guard suite on [context] with [ruleSet] and [registry].
/// Deterministic, no side effects, does not alter runtime state.
GuardReport runGuardSuite(
  GuardContext context,
  GuardRuleSet ruleSet,
  GuardValidatorRegistry registry,
) {
  final violations = runValidation(context, ruleSet, registry);
  final builder = GuardRunRecordBuilder(
    runId: 'guard-${context.contextId}',
    contextId: context.contextId,
    violations: violations,
    metadata: {'snapshotVersion': context.snapshot.version.toString()},
  );
  final record = builder.build();
  return GuardReport(record: record, context: context);
}

/// Creates a default registry with built-in validators registered.
GuardValidatorRegistry createDefaultRegistry() {
  final registry = GuardValidatorRegistry();
  registry.register(
    StandardGuardRules.snapshotImmutability.id,
    BuiltInValidators.checkSnapshotImmutability,
  );
  registry.register(
    StandardGuardRules.lifecyclePlanImmutability.id,
    BuiltInValidators.checkLifecyclePlanImmutability,
  );
  registry.register(
    StandardGuardRules.noDartIoDependency.id,
    BuiltInValidators.checkNoDartIo,
  );
  registry.register(
    StandardGuardRules.hashIntegrity.id,
    BuiltInValidators.checkHashIntegrity,
  );
  return registry;
}
