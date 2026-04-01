// Phase 11.2.1 — Read-only DTO. No semantics, no defaults.

class ModeDto {
  const ModeDto({required this.modeId, required this.label});

  final String modeId;
  final String label;

  factory ModeDto.fromJson(Map<String, dynamic> json) {
    return ModeDto(
      modeId: json['modeId'] as String,
      label: json['label'] as String,
    );
  }

  Map<String, dynamic> toJson() =>
      <String, dynamic>{'modeId': modeId, 'label': label};

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModeDto &&
          runtimeType == other.runtimeType &&
          modeId == other.modeId &&
          label == other.label;

  @override
  int get hashCode => Object.hash(modeId, label);
}
