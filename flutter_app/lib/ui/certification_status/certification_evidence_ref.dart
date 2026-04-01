// Microstep 12.1 - Technical reference to evidence. Not a legal proof claim.

class CertificationEvidenceRef {
  const CertificationEvidenceRef({
    required this.id,
    required this.description,
    required this.source,
    required this.version,
  });

  final String id;
  final String description;
  final String source;
  final String version;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'description': description,
        'source': source,
        'version': version,
      };

  factory CertificationEvidenceRef.fromJson(Map<String, dynamic> json) {
    final idVal = json['id'] as String?;
    final desc = json['description'] as String?;
    final src = json['source'] as String?;
    final ver = json['version'] as String?;
    if (idVal == null || idVal.isEmpty) {
      throw ArgumentError('id is required and non-empty');
    }
    if (desc == null || desc.isEmpty) {
      throw ArgumentError('description is required and non-empty');
    }
    if (src == null || src.isEmpty) {
      throw ArgumentError('source is required and non-empty');
    }
    if (ver == null || ver.isEmpty) {
      throw ArgumentError('version is required and non-empty');
    }
    return CertificationEvidenceRef(
      id: idVal,
      description: desc,
      source: src,
      version: ver,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificationEvidenceRef &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          description == other.description &&
          source == other.source &&
          version == other.version;

  @override
  int get hashCode => Object.hash(id, description, source, version);
}
