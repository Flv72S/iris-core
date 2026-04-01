import 'package:iris_flutter_app/core_freeze/core_freeze_artifact.dart';
import 'package:iris_flutter_app/core_freeze/default_core_surface_manifest.dart';

void main() {
  final artifact = buildCoreFreezeArtifact(defaultCoreSurfaceManifest);
  print(serializeFreezeArtifactCanonically(artifact));
}
