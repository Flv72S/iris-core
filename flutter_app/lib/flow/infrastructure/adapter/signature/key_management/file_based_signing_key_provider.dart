// K8 — File-based signing key provider. Deterministic, no entropy.

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:iris_flutter_app/flow/infrastructure/adapter/signature/key_management/signing_key_provider.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';

const String _kSigningKeysFileName = '.signing_keys';
const String _kConstantSalt = 'iris.signature.v1';

/// File-based implementation of [SigningKeyProvider].
/// Keys stored as version:keyHex (one per line); last line = active.
/// No Random, no DateTime; rotation is deterministic.
class FileBasedSigningKeyProvider implements SigningKeyProvider {
  FileBasedSigningKeyProvider({
    required NodeIdentityProvider nodeIdentityProvider,
    Directory? workingDirectory,
  })  : _nodeIdentity = nodeIdentityProvider,
        _directory = workingDirectory ?? Directory.current;

  final NodeIdentityProvider _nodeIdentity;
  final Directory _directory;

  File get _file => File(_path(_kSigningKeysFileName));
  String _path(String name) =>
      '${_directory.path}${Platform.pathSeparator}$name';

  static String _bytesToHex(List<int> bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  static List<int> _hexToBytes(String hex) {
    if (hex.length % 2 != 0) return [];
    final list = <int>[];
    for (var i = 0; i < hex.length; i += 2) {
      final s = hex.substring(i, i + 2);
      final v = int.tryParse(s, radix: 16);
      if (v == null || v < 0 || v > 255) return [];
      list.add(v);
    }
    return list;
  }

  List<_KeyLine> _readKeys() {
    if (!_file.existsSync()) return [];
    final lines = _file.readAsStringSync().split('\n');
    final result = <_KeyLine>[];
    for (final line in lines) {
      final t = line.trim();
      if (t.isEmpty) continue;
      final colon = t.indexOf(':');
      if (colon <= 0) continue;
      final ver = int.tryParse(t.substring(0, colon));
      final hex = t.substring(colon + 1).toLowerCase();
      if (ver == null || hex.isEmpty) continue;
      final bytes = _hexToBytes(hex);
      if (bytes.length != 32) continue;
      result.add(_KeyLine(ver, hex, bytes));
    }
    return result;
  }

  @override
  SigningKey getActiveKey() {
    final keys = _readKeys();
    if (keys.isEmpty) {
      final v1 = _generateV1Key();
      _file.writeAsStringSync('1:${_bytesToHex(v1)}\n', flush: true);
      return SigningKey(version: 1, keyBytes: v1);
    }
    final last = keys.last;
    return SigningKey(version: last.version, keyBytes: last.keyBytes);
  }

  List<int> _generateV1Key() {
    final nodeId = _nodeIdentity.getNodeId();
    final input = nodeId + _kConstantSalt + 'v1';
    final digest = sha256.convert(utf8.encode(input));
    return digest.bytes;
  }

  /// Legacy K7 key: SHA256(nodeId + salt) for verify of old signatures.
  SigningKey _getLegacyKey() {
    final nodeId = _nodeIdentity.getNodeId();
    final input = nodeId + _kConstantSalt;
    final digest = sha256.convert(utf8.encode(input));
    return SigningKey(version: 0, keyBytes: digest.bytes);
  }

  @override
  SigningKey? getKeyByVersion(int version) {
    if (version == 0) return _getLegacyKey();
    final keys = _readKeys();
    for (final k in keys) {
      if (k.version == version) return SigningKey(version: k.version, keyBytes: k.keyBytes);
    }
    return null;
  }

  /// Appends a new key version; new key = SHA256(previousKeyHex + salt + version).
  void rotateKey() {
    var keys = _readKeys();
    if (keys.isEmpty) {
      final v1 = _generateV1Key();
      _file.writeAsStringSync('1:${_bytesToHex(v1)}\n', flush: true);
      keys = _readKeys();
    }
    final maxVersion = keys.map((e) => e.version).reduce((a, b) => a > b ? a : b);
    final nextVersion = maxVersion + 1;
    final last = keys.last;
    final prevHex = _bytesToHex(last.keyBytes);
    final input = prevHex + _kConstantSalt + nextVersion.toString();
    final digest = sha256.convert(utf8.encode(input));
    final newKeyHex = _bytesToHex(digest.bytes);
    _file.writeAsStringSync('$nextVersion:$newKeyHex\n', mode: FileMode.append, flush: true);
  }
}

class _KeyLine {
  _KeyLine(this.version, this.hex, this.keyBytes);
  final int version;
  final String hex;
  final List<int> keyBytes;
}
