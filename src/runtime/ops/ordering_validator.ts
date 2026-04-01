export function hasIdenticalOrderAcrossNodes(sequences: Readonly<Record<string, readonly string[]>>): boolean {
  const nodeIds = Object.keys(sequences).sort();
  if (nodeIds.length <= 1) return true;
  const first = JSON.stringify(sequences[nodeIds[0]!] ?? []);
  for (const nodeId of nodeIds.slice(1)) {
    if (JSON.stringify(sequences[nodeId] ?? []) !== first) return false;
  }
  return true;
}
