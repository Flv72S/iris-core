/// O8 — Fork resolution strategy. Explicit, policy-driven; no automatic selection.

/// Strategy for resolving a fork. No timestamp or device priority.
enum ForkResolutionStrategy {
  /// Do not resolve automatically; defer to manual selection.
  manualSelection,

  /// Validate remote branch via full replay and apply if valid.
  preferRemote,

  /// Keep local branch; ensure integrity.
  preferLocal,

  /// Reject resolution.
  reject,
}

/// Policy for fork resolution. O8 default: manualSelection, requireFullReplayValidation = true.
class ForkResolutionPolicy {
  const ForkResolutionPolicy({
    this.strategy = ForkResolutionStrategy.manualSelection,
    this.requireFullReplayValidation = true,
  });

  final ForkResolutionStrategy strategy;
  final bool requireFullReplayValidation;

  /// O8 default: manual selection, full replay required.
  static const ForkResolutionPolicy defaultPolicy = ForkResolutionPolicy(
    strategy: ForkResolutionStrategy.manualSelection,
    requireFullReplayValidation: true,
  );
}
