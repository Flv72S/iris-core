export type RuntimeLifecycleState = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING';

export class NodeLifecycle {
  private state: RuntimeLifecycleState = 'STOPPED';

  get current(): RuntimeLifecycleState {
    return this.state;
  }

  beginStart(): void {
    if (this.state !== 'STOPPED') throw new Error(`invalid lifecycle transition ${this.state} -> STARTING`);
    this.state = 'STARTING';
  }

  markRunning(): void {
    if (this.state !== 'STARTING') throw new Error(`invalid lifecycle transition ${this.state} -> RUNNING`);
    this.state = 'RUNNING';
  }

  beginStop(): void {
    if (this.state !== 'RUNNING') throw new Error(`invalid lifecycle transition ${this.state} -> STOPPING`);
    this.state = 'STOPPING';
  }

  markStopped(): void {
    if (this.state !== 'STOPPING' && this.state !== 'STARTING') {
      throw new Error(`invalid lifecycle transition ${this.state} -> STOPPED`);
    }
    this.state = 'STOPPED';
  }
}
