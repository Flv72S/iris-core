/// OX3 — Base deterministic entity. Version from events; logical delete only.

abstract class DomainObject {
  String get id;
  String get type;
  int get version;
  int get createdAtHeight;
  int get updatedAtHeight;
  bool get isDeleted;
}
