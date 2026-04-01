/// OX4 — Pure projection to view model. No async, no side effects, no mutation.

abstract class UIProjectionAdapter<T, V> {
  V toViewModel(T state);
}
