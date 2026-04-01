// G7 - Entrypoint: forwards to lib so "dart run tooling/governance_ci/governance_ci_runner.dart" works.

import 'package:iris_flutter_app/governance_ci/governance_ci_runner.dart' as runner;

void main(List<String> args) => runner.main(args);
