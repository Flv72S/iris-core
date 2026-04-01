/// O1 — Secure identity storage using OS keychain (flutter_secure_storage).

import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:iris_flutter_app/core/network/identity/secure_identity_storage.dart';

/// Uses platform secure storage (keychain / encrypted storage). Bytes stored as base64.
class FlutterSecureIdentityStorage implements SecureIdentityStorage {
  FlutterSecureIdentityStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> write(String key, List<int> bytes) async {
    await _storage.write(key: key, value: base64Encode(bytes));
  }

  @override
  Future<List<int>?> read(String key) async {
    final value = await _storage.read(key: key);
    if (value == null) return null;
    return base64Decode(value);
  }

  @override
  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }
}
