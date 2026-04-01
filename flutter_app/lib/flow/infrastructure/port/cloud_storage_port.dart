// K1 — CloudStoragePort. Contract only; no implementation, no cloud dependency.

/// Port for cloud object storage abstraction.
/// All operations are content-deterministic; no internal timestamp or UUID.
/// Implementations are provided in later microsteps (e.g. K2).
abstract interface class CloudStoragePort {
  /// Uploads [content] to [bucket] under [key].
  /// Deterministic with respect to content; no side-effect beyond storage.
  Future<void> uploadObject(String bucket, String key, List<int> content);

  /// Downloads object at [bucket]/[key]. Returns empty list if not found.
  Future<List<int>> downloadObject(String bucket, String key);

  /// Returns true if object exists at [bucket]/[key].
  Future<bool> objectExists(String bucket, String key);

  /// Deletes object at [bucket]/[key]. Optional; may throw if not supported.
  Future<void> deleteObject(String bucket, String key);

  /// Lists object keys in [bucket] with optional [prefix].
  /// Returns keys only; order is implementation-defined but stable for same state.
  Future<List<String>> listObjects(String bucket, {String prefix = ''});
}
