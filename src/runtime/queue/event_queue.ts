type Task = () => Promise<void>;

export class EventQueue {
  private readonly queue: Task[] = [];
  private running = false;

  enqueue(task: Task): void {
    this.queue.push(task);
    if (!this.running) void this.drain();
  }

  private async drain(): Promise<void> {
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        await task();
      }
    } finally {
      this.running = false;
    }
  }
}
