/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

class CanonicalSerializer {
  CanonicalSerializer._();

  static List<int> canonicalSerialize(Map<String, dynamic> data) {
    return _serializeMap(data);
  }

  static List<int> _serializeMap(Map<String, dynamic> map) {
    final keys = map.keys.toList()..sort();
    final out = <int>[];
    for (final k in keys) {
      _appendString(out, k);
      _appendValue(out, map[k]!);
    }
    return out;
  }

  static void _appendValue(List<int> out, dynamic v) {
    if (v == null) {
      out.add(0);
      return;
    }
    if (v is int) {
      out.add(1);
      _appendInt64(out, v);
      return;
    }
    if (v is String) {
      out.add(2);
      _appendString(out, v);
      return;
    }
    if (v is bool) {
      out.add(3);
      out.add(v ? 1 : 0);
      return;
    }
    if (v is List) {
      out.add(4);
      _appendU32Be(out, v.length);
      for (final e in v) {
        _appendValue(out, e);
      }
      return;
    }
    if (v is Map<String, dynamic>) {
      out.add(5);
      out.addAll(_serializeMap(v));
      return;
    }
    throw ArgumentError('Unsupported type for canonical serialize: ${v.runtimeType}');
  }

  static void _appendString(List<int> out, String s) {
    final bytes = _utf8Encode(s);
    _appendU32Be(out, bytes.length);
    out.addAll(bytes);
  }

  static void _appendInt64(List<int> out, int n) {
    for (var i = 7; i >= 0; i--) {
      out.add((n >> (i * 8)) & 0xff);
    }
  }

  static void _appendU32Be(List<int> out, int n) {
    out.add((n >> 24) & 0xff);
    out.add((n >> 16) & 0xff);
    out.add((n >> 8) & 0xff);
    out.add(n & 0xff);
  }

  static List<int> _utf8Encode(String s) {
    final result = <int>[];
    for (var i = 0; i < s.length; i++) {
      final c = s.codeUnitAt(i);
      if (c <= 0x7f) {
        result.add(c);
      } else if (c <= 0x7ff) {
        result.add(0xc0 | (c >> 6));
        result.add(0x80 | (c & 0x3f));
      } else if (c <= 0xffff) {
        result.add(0xe0 | (c >> 12));
        result.add(0x80 | ((c >> 6) & 0x3f));
        result.add(0x80 | (c & 0x3f));
      } else {
        result.add(0xf0 | (c >> 18));
        result.add(0x80 | ((c >> 12) & 0x3f));
        result.add(0x80 | ((c >> 6) & 0x3f));
        result.add(0x80 | (c & 0x3f));
      }
    }
    return result;
  }

  /// Deserializes bytes produced by [canonicalSerialize] back to a map.
  /// Map keys are serialized as raw length+utf8 (no type tag); values use type tags.
  static Map<String, dynamic> canonicalDeserialize(List<int> bytes) {
    var offset = 0;
    final map = <String, dynamic>{};
    while (offset < bytes.length) {
      if (offset + 4 > bytes.length) break;
      final keyResult = _readStringRaw(bytes, offset);
      offset = keyResult.$2;
      final valueResult = _readValue(bytes, offset);
      map[keyResult.$1] = valueResult.$1;
      offset = valueResult.$2;
    }
    return map;
  }

  /// Reads string as serialized for map keys: 4-byte length + utf8 bytes (no type tag).
  static (String, int) _readStringRaw(List<int> bytes, int offset) {
    if (offset + 4 > bytes.length) throw ArgumentError('Truncated string length');
    final len = _readU32Be(bytes, offset);
    offset += 4;
    if (offset + len > bytes.length) throw ArgumentError('Truncated string bytes');
    final s = _utf8Decode(bytes.sublist(offset, offset + len));
    return (s, offset + len);
  }

  static (dynamic, int) _readValue(List<int> bytes, int offset) {
    if (offset >= bytes.length) {
      throw ArgumentError('Unexpected end of canonical bytes');
    }
    final tag = bytes[offset];
    offset += 1;
    switch (tag) {
      case 0:
        return (null, offset);
      case 1:
        if (offset + 8 > bytes.length) throw ArgumentError('Truncated int64');
        int n = 0;
        for (var i = 0; i < 8; i++) {
          n = (n << 8) | (bytes[offset + i] & 0xff);
        }
        offset += 8;
        return (n, offset);
      case 2:
        return _readString(bytes, offset);
      case 3:
        if (offset >= bytes.length) throw ArgumentError('Truncated bool');
        final b = bytes[offset] != 0;
        return (b, offset + 1);
      case 4:
        if (offset + 4 > bytes.length) throw ArgumentError('Truncated list length');
        final len = _readU32Be(bytes, offset);
        offset += 4;
        final list = <dynamic>[];
        for (var i = 0; i < len; i++) {
          final r = _readValue(bytes, offset);
          list.add(r.$1);
          offset = r.$2;
        }
        return (list, offset);
      case 5:
        final map = <String, dynamic>{};
        while (offset < bytes.length) {
          final keyResult = _readValue(bytes, offset);
          if (keyResult.$1 is! String) break;
          offset = keyResult.$2;
          final valueResult = _readValue(bytes, offset);
          map[keyResult.$1 as String] = valueResult.$1;
          offset = valueResult.$2;
        }
        return (map, offset);
      default:
        throw ArgumentError('Unknown canonical type tag: $tag');
    }
  }

  static (String, int) _readString(List<int> bytes, int offset) {
    if (offset + 4 > bytes.length) throw ArgumentError('Truncated string length');
    final len = _readU32Be(bytes, offset);
    offset += 4;
    if (offset + len > bytes.length) throw ArgumentError('Truncated string bytes');
    final s = _utf8Decode(bytes.sublist(offset, offset + len));
    return (s, offset + len);
  }

  static int _readU32Be(List<int> bytes, int offset) {
    return (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3];
  }

  static String _utf8Decode(List<int> bytes) {
    return String.fromCharCodes(bytes);
  }
}

