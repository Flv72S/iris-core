// Media Execution — Execution failure. Immutable value object; no runtime data.

/// Represents a failure that occurred during operation execution.
/// Immutable value object; no stack trace; no timestamp; no SDK references.
class ExecutionFailure {
  const ExecutionFailure({
    required this.code,
    required this.message,
  });

  /// Machine-readable error code.
  final String code;

  /// Human-readable error message.
  final String message;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ExecutionFailure &&
          code == other.code &&
          message == other.message);

  @override
  int get hashCode => Object.hash(code, message);

  Map<String, Object> toJson() => {
        'code': code,
        'message': message,
      };

  factory ExecutionFailure.fromJson(Map<String, Object?> json) {
    return ExecutionFailure(
      code: json['code'] as String,
      message: json['message'] as String,
    );
  }

  @override
  String toString() => 'ExecutionFailure($code: $message)';
}
