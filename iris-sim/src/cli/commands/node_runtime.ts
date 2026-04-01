import type { IrisNode } from '../../sdk/index.js';

let activeNode: IrisNode | null = null;

export function setActiveNode(node: IrisNode | null): void {
  activeNode = node;
}

export function getActiveNode(): IrisNode | null {
  return activeNode;
}

