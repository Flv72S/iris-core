// OX5 — Knowledge workspace. Composes projection + bridge + intents.

import 'package:iris_flutter_app/apps/knowledge/knowledge_projection.dart';
import 'package:iris_flutter_app/apps/knowledge/knowledge_view_model.dart';

/// Knowledge workspace: use KnowledgeProjection with UIStateBridge and IntentDispatcher.
/// Create nodes via OBJECT_CREATED, link via RELATIONSHIP_ADDED, tag via METADATA_SET.
class KnowledgeWorkspace {
  KnowledgeWorkspace({KnowledgeProjection? projection}) : projection = projection ?? KnowledgeProjection();

  final KnowledgeProjection projection;

  KnowledgeViewModelAdapter get viewModelAdapter => KnowledgeViewModelAdapter();
}
