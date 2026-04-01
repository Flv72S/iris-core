// K1 — NodeIdentityProvider. Contract only; no implementation.

/// Port for node identity. Identity must be supplied by environment;
/// no runtime UUID generation.
abstract interface class NodeIdentityProvider {
  /// Returns the node identifier (from environment/config).
  String getNodeId();
}
