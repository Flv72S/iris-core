import { NodeSupervisor, type SupervisedNodeConfig } from './node_supervisor';

export class MultiNodeRunner {
  private readonly supervisors: NodeSupervisor[];

  constructor(configs: readonly SupervisedNodeConfig[]) {
    this.supervisors = configs.map((c) => new NodeSupervisor(c));
  }

  startAll(): void {
    for (const s of this.supervisors) s.start();
  }

  stopAll(): void {
    for (const s of this.supervisors) s.stop();
  }

  restartAll(): void {
    this.stopAll();
    this.startAll();
  }
}
