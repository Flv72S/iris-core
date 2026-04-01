// Phase 11.9.1 — Immutable normative reference DTO. No interpretation; stable JSON.

/// Immutable reference to a normative provision. Describes only; makes no compliance claim.
class NormativeReference {
  const NormativeReference({
    required this.regulationId,
    required this.article,
    this.paragraph,
    required this.title,
    this.url,
  });

  final String regulationId;
  final String article;
  final String? paragraph;
  final String title;
  final String? url;

  /// Serialization with stable key order (alphabetical). Optional fields omitted when null.
  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'article': article,
      'regulationId': regulationId,
      'title': title,
    };
    if (paragraph != null) map['paragraph'] = paragraph;
    if (url != null) map['url'] = url;
    final keys = map.keys.toList()..sort();
    return Map.fromEntries(keys.map((k) => MapEntry(k, map[k])));
  }

  /// Deserialization. Throws if required fields missing or empty.
  factory NormativeReference.fromJson(Map<String, dynamic> json) {
    final regId = json['regulationId'] as String?;
    final art = json['article'] as String?;
    final t = json['title'] as String?;
    if (regId == null || regId.isEmpty) {
      throw ArgumentError('regulationId is required and non-empty');
    }
    if (art == null || art.isEmpty) {
      throw ArgumentError('article is required and non-empty');
    }
    if (t == null || t.isEmpty) {
      throw ArgumentError('title is required and non-empty');
    }
    return NormativeReference(
      regulationId: regId,
      article: art,
      paragraph: json['paragraph'] as String?,
      title: t,
      url: json['url'] as String?,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NormativeReference &&
          runtimeType == other.runtimeType &&
          regulationId == other.regulationId &&
          article == other.article &&
          paragraph == other.paragraph &&
          title == other.title &&
          url == other.url;

  @override
  int get hashCode =>
      Object.hash(regulationId, article, paragraph, title, url);
}
