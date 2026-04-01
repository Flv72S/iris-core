// L2 — Canonical serializer. Deterministic byte layout; no JSON, no reflection.

import 'dart:typed_data';

import 'package:iris_flutter_app/flow/application/model/operation_envelope.dart';
import 'package:iris_flutter_app/flow/application/model/operation_envelope_metadata.dart';
import 'package:iris_flutter_app/flow/application/serialization/operation_envelope_canonical.dart';

/// Serializes [OperationEnvelope] to deterministic canonical bytes.
/// Order: operationId, resourceId, payloadLen+payload, sigLen+sig, attrCount, then sorted key-value pairs.
class OperationEnvelopeCanonicalSerializer {
  OperationEnvelopeCanonical serialize(OperationEnvelope envelope) {
    final out = <int>[];

    _appendLengthPrefixedUtf8(out, envelope.operationId);
    _appendLengthPrefixedUtf8(out, envelope.resourceId);

    final payload = envelope.payload;
    _appendUint32Be(out, payload.length);
    out.addAll(payload);

    final sigBytes = envelope.signature.signatureBytes;
    _appendUint32Be(out, sigBytes.length);
    out.addAll(sigBytes);

    final attrs = envelope.metadata.attributes;
    final keys = attrs.keys.toList()..sort();
    _appendUint32Be(out, keys.length);
    for (final k in keys) {
      _appendLengthPrefixedUtf8(out, k);
      _appendLengthPrefixedUtf8(out, attrs[k]!);
    }

    return OperationEnvelopeCanonical(out);
  }

  static void _appendUint32Be(List<int> out, int value) {
    out.add((value >> 24) & 0xff);
    out.add((value >> 16) & 0xff);
    out.add((value >> 8) & 0xff);
    out.add(value & 0xff);
  }

  static void _appendLengthPrefixedUtf8(List<int> out, String s) {
    final utf8 = _utf8Encode(s);
    _appendUint32Be(out, utf8.length);
    out.addAll(utf8);
  }

  static Uint8List _utf8Encode(String s) {
    final runes = s.runes;
    final list = <int>[];
    for (final r in runes) {
      if (r <= 0x7f) {
        list.add(r);
      } else if (r <= 0x7ff) {
        list.add(0xc0 | (r >> 6));
        list.add(0x80 | (r & 0x3f));
      } else if (r <= 0xffff) {
        list.add(0xe0 | (r >> 12));
        list.add(0x80 | ((r >> 6) & 0x3f));
        list.add(0x80 | (r & 0x3f));
      } else {
        list.add(0xf0 | (r >> 18));
        list.add(0x80 | ((r >> 12) & 0x3f));
        list.add(0x80 | ((r >> 6) & 0x3f));
        list.add(0x80 | (r & 0x3f));
      }
    }
    return Uint8List.fromList(list);
  }
}
