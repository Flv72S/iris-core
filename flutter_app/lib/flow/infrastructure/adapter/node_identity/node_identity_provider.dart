// K6.1 — File-based node identity. Durable, deterministic, no PID/UUID/entropy.

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/infrastructure_exception.dart';
import 'package:iris_flutter_app/flow/infrastructure/port/node_identity_provider.dart';

const String _kNodeIdentityFileName = '.node_identity';
const String _kConstantSalt = 'iris.node_identity.v1';

/// File-based implementation of [NodeIdentityProvider].
/// Generates a deterministic nodeId from canonicalAbsolutePath + salt; no PID, no runtime entropy.
/// Existing `.node_identity` files are returned as-is (backward compatible).
class FileBasedNodeIdentityProvider implements NodeIdentityProvider {
  FileBasedNodeIdentityProvider({Directory? workingDirectory})
      : _workingDirectory = workingDirectory ?? Directory.current;

  final Directory _workingDirectory;
  String? _cachedNodeId;

  /// Canonical path: normalized, no trailing slash, cross-platform consistent.
  /// Uses absolute path when available (e.g. injected workingDirectory).
  String get _canonicalAbsolutePath {
    var p = _workingDirectory.uri.resolve('.').toFilePath(windows: Platform.isWindows);
    final sep = Platform.pathSeparator;
    while (p.length > 1 && (p.endsWith(sep) || p.endsWith('/'))) {
      p = p.substring(0, p.length - 1);
    }
    return p;
  }

  @override
  String getNodeId() {
    if (_cachedNodeId != null) return _cachedNodeId!;
    try {
      final file = File(_workingDirectory.path + Platform.pathSeparator + _kNodeIdentityFileName);
      if (file.existsSync()) {
        final content = file.readAsStringSync().trim();
        if (content.isEmpty) {
          _cachedNodeId = _generateNodeId();
          _writeNodeId(file);
          return _cachedNodeId!;
        }
        if (!_isValidNodeId(content)) {
          throw NodeIdentityException('Corrupted or invalid node identity file');
        }
        _cachedNodeId = content;
        return _cachedNodeId!;
      }
      _cachedNodeId = _generateNodeId();
      _writeNodeId(file);
      return _cachedNodeId!;
    } on NodeIdentityException {
      rethrow;
    } catch (e) {
      throw NodeIdentityException('Failed to get node identity', e);
    }
  }

  /// NodeId must be lowercase hex, 64 chars (SHA256).
  bool _isValidNodeId(String s) {
    if (s.length != 64) return false;
    for (var i = 0; i < s.length; i++) {
      final c = s.codeUnitAt(i);
      if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
    }
    return true;
  }

  String _generateNodeId() {
    final input = _canonicalAbsolutePath + _kConstantSalt;
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString().toLowerCase();
  }

  void _writeNodeId(File file) {
    try {
      file.writeAsStringSync(_cachedNodeId!, flush: true);
    } catch (e) {
      throw NodeIdentityException('Failed to write node identity file', e);
    }
  }
}
