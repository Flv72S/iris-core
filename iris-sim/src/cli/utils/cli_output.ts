export function ok(msg: string): string {
  return `\x1b[32m${msg}\x1b[0m`;
}

export function warn(msg: string): string {
  return `\x1b[33m${msg}\x1b[0m`;
}

export function err(msg: string): string {
  return `\x1b[31m${msg}\x1b[0m`;
}

