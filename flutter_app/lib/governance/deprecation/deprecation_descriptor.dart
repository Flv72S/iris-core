// G5 - Deprecation descriptor. Immutable.

import 'package:iris_flutter_app/governance/change/change_scope.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';

class DeprecationDescriptor {
  const DeprecationDescriptor({
    required this.identifier,
    required this.scope,
    required this.startVersion,
    required this.sunsetVersion,
    required this.rationale,
    this.replacement,
  });

  final String identifier;
  final ChangeScope scope;
  final Version startVersion;
  final Version sunsetVersion;
  final String rationale;
  final String? replacement;

  Map<String, Object> toJson() => {
        'identifier': identifier,
        'scope': scope.name,
        'startVersion': startVersion.toString(),
        'sunsetVersion': sunsetVersion.toString(),
        'rationale': rationale,
        if (replacement != null) 'replacement': replacement!,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DeprecationDescriptor &&
          identifier == other.identifier &&
          scope == other.scope &&
          startVersion == other.startVersion &&
          sunsetVersion == other.sunsetVersion &&
          rationale == other.rationale &&
          replacement == other.replacement);

  @override
  int get hashCode => Object.hash(identifier, scope, startVersion, sunsetVersion, rationale, replacement);
}
