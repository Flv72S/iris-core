// I7 - Observability logger. Immutable audit log; no side effects.

import 'dart:convert';

import 'observability_event.dart';
import 'observability_hook.dart';
import 'observability_serializer.dart';

/// Immutable log entry for an observability event.
class ObservabilityLogEntry {
  const ObservabilityLogEntry({
    required this.sequenceNumber,
    required this.event,
    required this.eventHash,
  });

  /// Sequential number within the log.
  final int sequenceNumber;

  /// The observability event.
  final ObservabilityEvent event;

  /// Deterministic hash of the event.
  final String eventHash;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ObservabilityLogEntry &&
          sequenceNumber == other.sequenceNumber &&
          event == other.event &&
          eventHash == other.eventHash);

  @override
  int get hashCode => Object.hash(sequenceNumber, event, eventHash);

  /// Serializes to JSON map.
  Map<String, dynamic> toJson() => {
        'sequenceNumber': sequenceNumber,
        'event': event.toJson(),
        'eventHash': eventHash,
      };

  /// Deserializes from JSON map.
  factory ObservabilityLogEntry.fromJson(Map<String, dynamic> json) {
    return ObservabilityLogEntry(
      sequenceNumber: json['sequenceNumber'] as int,
      event: _eventFromJson(json['event'] as Map<String, dynamic>),
      eventHash: json['eventHash'] as String,
    );
  }

  static ObservabilityEvent _eventFromJson(Map<String, dynamic> json) {
    return ObservabilitySerializer.eventFromJson(json);
  }

  @override
  String toString() =>
      'ObservabilityLogEntry(seq: $sequenceNumber, eventId: ${event.eventId}, hash: $eventHash)';
}

/// Immutable observability log.
class ObservabilityLog {
  const ObservabilityLog(this._entries);

  /// Creates an empty log.
  const ObservabilityLog.empty() : _entries = const [];

  final List<ObservabilityLogEntry> _entries;

  /// Returns an unmodifiable view of all entries.
  List<ObservabilityLogEntry> get entries => List.unmodifiable(_entries);

  /// Returns the number of entries.
  int get length => _entries.length;

  /// Returns true if the log is empty.
  bool get isEmpty => _entries.isEmpty;

  /// Returns true if the log is not empty.
  bool get isNotEmpty => _entries.isNotEmpty;

  /// Returns entries for a specific event type.
  List<ObservabilityLogEntry> entriesOfType(ObservabilityEventType type) {
    return _entries.where((e) => e.event.eventType == type).toList();
  }

  /// Returns all failure entries.
  List<ObservabilityLogEntry> get failures {
    return _entries.where((e) => e.event.isFailure).toList();
  }

  /// Calculates a deterministic hash of the entire log.
  String get logHash {
    final hashes = _entries.map((e) => e.eventHash).join(':');
    return ObservabilitySerializer.computeHash(hashes);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ObservabilityLog && _listEquals(_entries, other._entries));

  static bool _listEquals(
      List<ObservabilityLogEntry> a, List<ObservabilityLogEntry> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hashAll(_entries);

  /// Serializes to JSON map.
  Map<String, dynamic> toJson() => {
        'entries': _entries.map((e) => e.toJson()).toList(),
        'logHash': logHash,
      };

  /// Deserializes from JSON map.
  factory ObservabilityLog.fromJson(Map<String, dynamic> json) {
    final entriesJson = json['entries'] as List;
    return ObservabilityLog(
      entriesJson
          .map((e) => ObservabilityLogEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Serializes to JSON string.
  String toJsonString() => jsonEncode(toJson());
}

/// Builder for creating ObservabilityLog.
class ObservabilityLogBuilder implements ObservabilityHook {
  ObservabilityLogBuilder();

  final List<ObservabilityLogEntry> _entries = [];
  int _sequenceCounter = 0;

  /// Returns the current sequence number.
  int get currentSequence => _sequenceCounter;

  /// Returns the number of entries.
  int get length => _entries.length;

  /// Adds an event to the log.
  void addEvent(ObservabilityEvent event) {
    final hash = ObservabilitySerializer.computeEventHash(event);
    _entries.add(ObservabilityLogEntry(
      sequenceNumber: _sequenceCounter++,
      event: event,
      eventHash: hash,
    ));
  }

  @override
  void onEvent(ObservabilityEvent event) {
    addEvent(event);
  }

  /// Builds an immutable ObservabilityLog.
  ObservabilityLog build() => ObservabilityLog(List.unmodifiable(_entries));
}

/// Logger hook that creates immutable log entries.
class ObservabilityLogger implements ObservabilityHook {
  ObservabilityLogger({ObservabilityHook? delegate})
      : _builder = ObservabilityLogBuilder(),
        _delegate = delegate;

  final ObservabilityLogBuilder _builder;
  final ObservabilityHook? _delegate;

  /// Returns the current log (snapshot).
  ObservabilityLog get log => _builder.build();

  /// Returns the number of logged events.
  int get length => _builder.length;

  @override
  void onEvent(ObservabilityEvent event) {
    _builder.addEvent(event);
    _delegate?.onEvent(event);
  }
}
