/// Synchronous storage adapter interface.
/// Used for deterministic persistence; no async in core usage.

abstract class StorageAdapter {
  void saveBytes(String key, List<int> bytes);
  List<int>? loadBytes(String key);
  void delete(String key);
}
