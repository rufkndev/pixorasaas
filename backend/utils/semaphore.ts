// Ограничитель параллельности для тяжёлых задач. Очередь ограничена: при
// наплыве лучше честно ответить «занято», чем копить запросы, которые всё
// равно отвалятся по таймауту прокси.
export class BusyError extends Error {
  constructor() {
    super('Сервер перегружен');
  }
}

export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number, private readonly maxQueue: number) {}

  // Для мониторинга: сколько генераций идёт и сколько ждёт
  stats(): { active: number; queued: number; limit: number; maxQueue: number } {
    return { active: this.active, queued: this.waiting.length, limit: this.limit, maxQueue: this.maxQueue };
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return Promise.resolve();
    }

    if (this.waiting.length >= this.maxQueue) {
      return Promise.reject(new BusyError());
    }

    // Место передаётся ожидающему напрямую, счётчик при этом не меняется
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.active--;
    }
  }
}
