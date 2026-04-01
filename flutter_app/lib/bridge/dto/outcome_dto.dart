// Phase 11.2.1 — Read-only DTO. No semantics, no defaults.

/// Outcome payload from Core. Immutable, structural only.
class OutcomeDto {
  const OutcomeDto({
    required this.status,
    required this.effects,
  });

  final String status;
  final List<dynamic> effects;

  factory OutcomeDto.fromJson(Map<String, dynamic> json) {
    return OutcomeDto(
      status: json['status'] as String,
      effects: (json['effects'] as List<dynamic>).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'status': status,
        'effects': List<dynamic>.from(effects),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OutcomeDto &&
          runtimeType == other.runtimeType &&
          status == other.status &&
          _listEquals(effects, other.effects);

  @override
  int get hashCode => Object.hash(status, Object.hashAll(effects));

  static bool _listEquals(List<dynamic> a, List<dynamic> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
