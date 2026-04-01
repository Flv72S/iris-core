// OX5 — Task board app. Composes TaskProjection + adapter.

import 'package:iris_flutter_app/apps/tasks/task_projection.dart';
import 'package:iris_flutter_app/apps/tasks/task_view_model.dart';

class TaskBoard {
  TaskBoard({TaskProjection? projection}) : projection = projection ?? TaskProjection();

  final TaskProjection projection;

  TaskViewModelAdapter get viewModelAdapter => TaskViewModelAdapter();
}
