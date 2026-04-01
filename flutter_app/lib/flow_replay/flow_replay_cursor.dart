// F8 — Replay cursor. Position only; does not modify events or know live runtime.

/// Immutable cursor over a replay sequence. Controlled advancement only.
class FlowReplayCursor {
  const FlowReplayCursor(this.eventIndex);

  final int eventIndex;

  /// Whether there is a next event (index + 1 < maxLength).
  bool canAdvance(int eventCount) =>
      eventCount > 0 && eventIndex < eventCount - 1;

  /// Cursor at the next event. Does not mutate anything.
  FlowReplayCursor advance() => FlowReplayCursor(eventIndex + 1);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowReplayCursor && eventIndex == other.eventIndex);

  @override
  int get hashCode => eventIndex.hashCode;
}
