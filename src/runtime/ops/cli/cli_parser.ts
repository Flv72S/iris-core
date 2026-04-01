export function parseArgs(argv: readonly string[]): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [k, v] = arg.slice(2).split('=', 2);
    if (k.length > 0 && v !== undefined) out[k] = v;
  }
  return Object.freeze(out);
}
