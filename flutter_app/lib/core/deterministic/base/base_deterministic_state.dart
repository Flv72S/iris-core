/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

abstract class BaseDeterministicState implements DeterministicState {
  @override
  final int stateVersion;

  BaseDeterministicState(this.stateVersion);

  Map<String, dynamic> toCanonicalMap();

  late final List<int> _canonicalBytes =
      CanonicalSerializer.canonicalSerialize(toCanonicalMap());

  late final int _deterministicHash =
      DeterministicHash.computeDeterministicHash(_canonicalBytes);

  @override
  List<int> get canonicalBytes => _canonicalBytes;

  @override
  int get deterministicHash => _deterministicHash;
}
