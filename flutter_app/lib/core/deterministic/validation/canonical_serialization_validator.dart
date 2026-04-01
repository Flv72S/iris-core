/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';

class CanonicalSerializationValidator {
  CanonicalSerializationValidator._();

  static const bool strictDeterminismValidation = true;

  static void _rejectNanOrInfinity(dynamic v) {
    if (v is num) {
      if (v.isNaN || v.isInfinite) {
        throw DeterministicViolation(
          'Numeric instability: NaN or Infinity not allowed in canonical data',
        );
      }
    }
    if (v is Map<String, dynamic>) {
      for (final entry in v.entries) {
        _rejectNanOrInfinity(entry.value);
      }
      return;
    }
    if (v is List) {
      for (final e in v) {
        _rejectNanOrInfinity(e);
      }
    }
  }

  /// Confirms that map key insertion order does not affect output:
  /// two maps with same logical content but different key order produce identical bytes.
  static void validateMapOrdering(Map<String, dynamic> input) {
    if (!strictDeterminismValidation) return;
    _rejectNanOrInfinity(input);
    final bytes1 = CanonicalSerializer.canonicalSerialize(input);
    final reordered = _rebuildWithSortedKeys(input);
    final bytes2 = CanonicalSerializer.canonicalSerialize(reordered);
    if (!_byteListsEqual(bytes1, bytes2)) {
      throw DeterministicViolation(
        'Map ordering violation: same logical data produced different canonical bytes',
      );
    }
  }

  static Map<String, dynamic> _rebuildWithSortedKeys(Map<String, dynamic> map) {
    final keys = map.keys.toList()..sort();
    final out = <String, dynamic>{};
    for (final k in keys) {
      final v = map[k]!;
      out[k] = v is Map<String, dynamic>
          ? _rebuildWithSortedKeys(v)
          : v is List
              ? _rebuildList(v)
              : v;
    }
    return out;
  }

  static List<dynamic> _rebuildList(List list) {
    final out = <dynamic>[];
    for (final e in list) {
      out.add(e is Map<String, dynamic>
          ? _rebuildWithSortedKeys(e)
          : e is List
              ? _rebuildList(e)
              : e);
    }
    return out;
  }

  static bool _byteListsEqual(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  /// Serializes input twice and ensures identical bytes (no hidden non-determinism).
  static void validateDeterministicEncoding(Map<String, dynamic> input) {
    _rejectNanOrInfinity(input);
    final bytes1 = CanonicalSerializer.canonicalSerialize(input);
    final bytes2 = CanonicalSerializer.canonicalSerialize(input);
    if (!_byteListsEqual(bytes1, bytes2)) {
      throw DeterministicViolation(
        'Deterministic encoding violation: repeated serialization produced different bytes',
      );
    }
  }

  /// Same as validateDeterministicEncoding; ensures byte stability across calls.
  static void validateByteStability(Map<String, dynamic> input) {
    _rejectNanOrInfinity(input);
    final bytes1 = CanonicalSerializer.canonicalSerialize(input);
    final bytes2 = CanonicalSerializer.canonicalSerialize(input);
    if (!_byteListsEqual(bytes1, bytes2)) {
      throw DeterministicViolation(
        'Byte stability violation: canonical bytes differ across serialization',
      );
    }
  }
}
