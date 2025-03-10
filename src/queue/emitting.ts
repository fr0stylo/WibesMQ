import EventEmitter from 'node:events';
import { setTimeout } from 'node:timers/promises';

import { Queue } from './queue.js';
import { QueueEntry } from './types.js';

export type QueueEmit<T> = { size: number; item: T | undefined; name: string };
export class EmitingQueue<T> extends Queue<T> {
  private emitter: EventEmitter = new EventEmitter();
  private sleeping = false;
  constructor(...props: any) {
    super(props);

    this.emitter.on('tick', async () => {
      if (!this.sleeping) {
        this.sleeping = true;
        await setTimeout(100);
        this.sleeping = false;
        if (this.size() > 0) {
          this.trigger();
        }
      }
    });
  }

  handler(listener: (x: QueueEmit<T>) => Promise<void>) {
    this.emitter.on('tick', listener);
  }

  trigger(): void {
    this.emitter.emit('tick', { size: this.size(), item: undefined, name: this.name });
  }

  _enqueue(item: QueueEntry<T>): void {
    this.emitter.emit('tick', { size: this.size(), item, name: this.name });
    super._enqueue(item);
  }
}
