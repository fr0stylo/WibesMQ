import { randomUUID } from 'node:crypto';
import { GenericQueue, QueueEntry, PendingQueueItem } from './types.js';

export class Queue<T> implements GenericQueue<T> {
  private items: QueueEntry<T>[] = [];
  constructor(public name: string) {}

  nack(msg: QueueEntry<T>): void {
    msg.retried++;
    this.items.unshift(msg);
  }

  ack(msg: QueueEntry<T>): void {}

  protected _enqueue(item: QueueEntry<T>): void {
    this.items.push(item);
  }

  load(items: QueueEntry<T>[]): void {
    this.items = items;
  }

  enqueue(item: T): void {
    this._enqueue({ messageID: randomUUID(), enqueued: Date.now(), payload: item, retried: 0 });
  }

  size(): number {
    return this.items.length;
  }

  dequeue(): PendingQueueItem<T> | undefined {
    if (this.size() === 0) {
      return undefined;
    }

    const { payload, ...metadata } = this.items.shift()!;
    return {
      data: payload,
      metadata,
      ack: () => this.ack({ payload, ...metadata }),
      nack: () => this.nack({ payload, ...metadata }),
    };
  }
}
