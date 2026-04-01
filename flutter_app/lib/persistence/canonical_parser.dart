// J4/J5 — Canonical format parser (shared). No JSON.

/// Parses the canonical string produced by DeterministicHashEngine.toCanonicalString
/// back to Map<String, dynamic>. Used by persistence adapter and integrity verifier.
class PersistenceCanonicalParser {
  PersistenceCanonicalParser._();

  static Map<String, dynamic> parseToMap(
    String canonical, {
    Set<String>? topLevelKeys,
  }) {
    if (canonical.isEmpty) return {};
    final result = _parseMap(canonical, 0, stopKeys: topLevelKeys, isRoot: true);
    return result.$1;
  }

  static (Map<String, dynamic>, int) _parseMap(
    String s,
    int start, {
    Set<String>? stopKeys,
    bool isRoot = false,
  }) {
    final map = <String, dynamic>{};
    var pos = start;
    while (pos < s.length) {
      final keyResult = _readKey(s, pos);
      final key = keyResult.$1;
      final keyEnd = keyResult.$2;
      if (keyEnd >= s.length || s[keyEnd] != '=') break;
      if (!isRoot && stopKeys != null && stopKeys.contains(key)) break;
      pos = keyEnd + 1;
      final valueResult = _parseValue(s, pos, stopKeys: stopKeys);
      map[key] = valueResult.$1;
      pos = valueResult.$2;
      if (pos < s.length && s[pos] == ';') pos++;
    }
    return (map, pos);
  }

  static (String, int) _readKey(String s, int start) {
    final eqIndex = _findUnescaped(s, start, '=');
    if (eqIndex < 0) return (_unescape(s.substring(start)), s.length);
    return (_unescape(s.substring(start, eqIndex)), eqIndex);
  }

  static (Object?, int) _parseValue(String s, int start, {Set<String>? stopKeys}) {
    if (start >= s.length) return (null, start);
    if (_matches(s, start, 'null') && _atEndOrSemi(s, start + 4)) return (null, start + 4);
    if (_matches(s, start, 'true') && _atEndOrSemi(s, start + 4)) return (true, start + 4);
    if (_matches(s, start, 'false') && _atEndOrSemi(s, start + 5)) return (false, start + 5);
    if (s[start] == '[') return _parseList(s, start, stopKeys: stopKeys);
    final keyResult = _readKey(s, start);
    if (keyResult.$2 < s.length && s[keyResult.$2] == '=' && !keyResult.$1.contains(';')) {
      return _parseMap(s, start, stopKeys: stopKeys, isRoot: false);
    }
    final semi = _findNextSemicolon(s, start);
    final end = semi >= 0 ? semi + 1 : s.length;
    final valueStr = semi >= 0 ? s.substring(start, semi) : s.substring(start);
    return (_interpret(valueStr), end);
  }

  static bool _matches(String s, int start, String token) {
    if (start + token.length > s.length) return false;
    return s.substring(start, start + token.length) == token;
  }

  static bool _atEndOrSemi(String s, int pos) =>
      pos >= s.length || s[pos] == ';';

  static int _findNextSemicolon(String s, int start) {
    for (var i = start; i < s.length;) {
      if (s[i] == '\\' && i + 1 < s.length) { i += 2; continue; }
      if (s[i] == ';') return i;
      i++;
    }
    return -1;
  }

  static int _findUnescaped(String s, int start, String char) {
    for (var i = start; i < s.length;) {
      if (s[i] == '\\' && i + 1 < s.length) { i += 2; continue; }
      if (s[i] == char) return i;
      i++;
    }
    return -1;
  }

  static Object? _interpret(String valueStr) {
    if (valueStr == 'null') return null;
    if (valueStr == 'true') return true;
    if (valueStr == 'false') return false;
    final num? n = num.tryParse(valueStr);
    if (n != null) return n;
    if (_findUnescaped(valueStr, 0, '=') >= 0 && _findNextSemicolon(valueStr, 0) >= 0) {
      return _parseMap(valueStr, 0).$1;
    }
    return _unescape(valueStr);
  }

  static (List<Object?>, int) _parseList(String s, int start, {Set<String>? stopKeys}) {
    final list = <Object?>[];
    var pos = start + 1;
    while (pos < s.length) {
      if (s[pos] == '[') pos++;
      if (pos >= s.length || !_isDigit(s[pos])) break;
      final eqIdx = s.indexOf(']=', pos);
      if (eqIdx < 0) break;
      final index = int.tryParse(s.substring(pos, eqIdx)) ?? 0;
      pos = eqIdx + 2;
      final valueResult = _parseValue(s, pos, stopKeys: stopKeys);
      while (list.length <= index) list.add(null);
      list[index] = valueResult.$1;
      pos = valueResult.$2;
      if (pos < s.length && s[pos] == ';') pos++;
      if (pos >= s.length || s[pos] != '[') break;
      pos++;
    }
    return (list, pos);
  }

  static bool _isDigit(String c) =>
      c.isNotEmpty && c.codeUnitAt(0) >= 0x30 && c.codeUnitAt(0) <= 0x39;

  static String _unescape(String s) {
    final sb = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (s[i] == '\\' && i + 1 < s.length) {
        switch (s[i + 1]) {
          case '\\': sb.write('\\'); break;
          case 'n': sb.write('\n'); break;
          case '=': sb.write('='); break;
          case ';': sb.write(';'); break;
          case '|': sb.write('|'); break;
          default: sb.write(s[i + 1]);
        }
        i++;
        continue;
      }
      sb.write(s[i]);
    }
    return sb.toString();
  }
}
