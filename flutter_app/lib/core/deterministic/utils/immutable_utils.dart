/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

class ImmutableUtils {
  ImmutableUtils._();

  static List<T> unmodifiableList<T>(List<T> source) =>
      List<T>.unmodifiable(List<T>.from(source));

  static Map<K, V> unmodifiableMap<K, V>(Map<K, V> source) =>
      Map<K, V>.unmodifiable(Map<K, V>.from(source));
}
