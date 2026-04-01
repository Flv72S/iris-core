import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/versioning/version_comparator.dart';
import 'package:iris_flutter_app/governance/versioning/version_parser.dart';

void main() {
  test('1.2.0 > 1.1.9', () {
    final a = VersionParser.parse('1.2.0');
    final b = VersionParser.parse('1.1.9');
    expect(VersionComparator.isGreaterThan(a, b), true);
  });

  test('1.0.0 > 1.0.0-alpha', () {
    final release = VersionParser.parse('1.0.0');
    final pre = VersionParser.parse('1.0.0-alpha');
    expect(VersionComparator.isGreaterThan(release, pre), true);
  });

  test('2.0.0 > 1.9.9', () {
    final a = VersionParser.parse('2.0.0');
    final b = VersionParser.parse('1.9.9');
    expect(VersionComparator.isGreaterThan(a, b), true);
  });
}
