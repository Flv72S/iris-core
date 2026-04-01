// G7 - Retention policy. Extensible structure; forward-compatible.

/// Retention policy variants. Use [kind] to discriminate.
abstract class RetentionPolicy {
  const RetentionPolicy();
  String get kind;
}

class RetentionLocalOnly extends RetentionPolicy {
  const RetentionLocalOnly() : super();
  @override
  String get kind => 'LOCAL_ONLY';
  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is RetentionLocalOnly;
  @override
  int get hashCode => kind.hashCode;
}

class RetentionDaysLimited extends RetentionPolicy {
  const RetentionDaysLimited(this.days) : super();
  final int days;
  @override
  String get kind => 'DAYS_LIMITED';
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is RetentionDaysLimited && days == other.days);
  @override
  int get hashCode => Object.hash(kind, days);
}

class RetentionConfigurable extends RetentionPolicy {
  const RetentionConfigurable() : super();
  @override
  String get kind => 'CONFIGURABLE';
  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is RetentionConfigurable;
  @override
  int get hashCode => kind.hashCode;
}
