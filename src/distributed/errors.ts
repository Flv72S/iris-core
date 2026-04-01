/**
 * 16F.6.A — Distributed input / validation errors (shared by logical time, events, global input).
 */
export class DistributedInputValidationError extends Error {
  override readonly name = 'DistributedInputValidationError';
  constructor(
    message: string,
    readonly details?: readonly string[],
  ) {
    super(details !== undefined && details.length > 0 ? `${message}: ${details.join('; ')}` : message);
  }
}
