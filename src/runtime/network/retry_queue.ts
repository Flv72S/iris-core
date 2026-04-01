export interface RetryTask {
  readonly id: string;
  readonly attempt: number;
  readonly run: () => Promise<boolean>;
}

export class RetryQueue {
  private readonly tasks = new Map<string, RetryTask>();

  enqueue(task: RetryTask): void {
    this.tasks.set(task.id, task);
  }

  clear(): void {
    this.tasks.clear();
  }

  async flush(): Promise<void> {
    const entries = [...this.tasks.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (const task of entries) {
      const ok = await task.run();
      if (ok) this.tasks.delete(task.id);
    }
  }
}
