/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/base_deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/utils/immutable_utils.dart';

class ExampleState extends BaseDeterministicState {
  ExampleState({
    required this.name,
    required this.counter,
    required List<String> tags,
    int stateVersion = 1,
  })  : _tags = ImmutableUtils.unmodifiableList(tags),
        super(stateVersion);

  final String name;
  final int counter;
  final List<String> _tags;

  List<String> get tags => _tags;

  @override
  Map<String, dynamic> toCanonicalMap() => {
        'stateVersion': stateVersion,
        'name': name,
        'counter': counter,
        'tags': List<String>.from(_tags),
      };
}
