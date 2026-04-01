import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/governance/versioning/version.dart';
import 'package:iris_flutter_app/governance/versioning/version_parser.dart';

void main() {
  test('valid versions parse', () {
    expect(VersionParser.parse('1.0.0'), const Version(major: 1, minor: 0, patch: 0));
    expect(VersionParser.parse('2.3.4'), const Version(major: 2, minor: 3, patch: 4));
    expect(VersionParser.parse('1.0.0-alpha'), const Version(major: 1, minor: 0, patch: 0, preRelease: 'alpha'));
  });

  test('invalid versions throw', () {
    expect(() => VersionParser.parse('1'), throwsA(isA<VersionParseException>()));
    expect(() => VersionParser.parse('1.0'), throwsA(isA<VersionParseException>()));
    expect(() => VersionParser.parse('1.0.0.0'), throwsA(isA<VersionParseException>()));
    expect(() => VersionParser.parse('a.b.c'), throwsA(isA<VersionParseException>()));
  });
}
