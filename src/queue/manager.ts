import { DurableQueue } from './durable.js';
import { QueueEmit } from './emitting.js';
import { GenericQueue, QueueEntry } from './types.js';
import { WALManager } from './wal.js';

type QueueEventListener<R, T> = (ev: QueueEmit<R>, subscriberID: string, queue: GenericQueue<unknown>) => Promise<void>;
export class QueueManager<R, T> {
  constructor(
    public onQueueEventListener: QueueEventListener<R, T> = async () => {},
    private wal: WALManager = new WALManager('queue.wal', 'queue.snapshot'),
    private queues: Record<string, GenericQueue<R>> = {},
    private subscribers: Record<string, Set<string>> = {},
  ) {
    this._onQueueEvent = this._onQueueEvent.bind(this);
  }

  private async _onQueueEvent(ev: QueueEmit<R>) {
    const queue = this.queues[ev.name[0]];
    const subscribers = this.subscribers[ev.name[0]];
    if (queue && queue.size() > 0 && subscribers && subscribers.size > 0) {
      const [subscriber] = subscribers;
      subscribers.delete(subscriber);
      await this.onQueueEventListener(ev, subscriber, queue);
    }
  }

  private _createIfNotExists(name: string) {
    if (!this.queues[name]) {
      const queue = new DurableQueue<R>(this.wal, name);
      queue.handler(this._onQueueEvent);
      queue.trigger();
      this.queues[name] = queue;
    }

    return this.queues[name] as DurableQueue<R>;
  }

  async load() {
    const entries = await this.wal.loadSnapshot<QueueEntry<R>>();
    const queues = entries.reduce(
      (acc, x) => {
        if (!acc[x.queue]) {
          acc[x.queue] = [];
        }
        acc[x.queue].push(x.payload);

        return acc;
      },
      {} as Record<string, QueueEntry<R>[]>,
    );

    for (const key in queues) {
      const queue = this._createIfNotExists(key);
      queue.load(queues[key]);
      console.info(`Queue ${key} restored ${queues[key].length} items`);
    }
  }

  createQueue(name: string) {
    this._createIfNotExists(name);
  }

  subscribe(name: string, subscriberID: string) {
    const queue = this._createIfNotExists(name);

    if (!this.subscribers[name]) {
      this.subscribers[name] = new Set<string>();
    }

    this.subscribers[name].add(subscriberID);
    queue.trigger();
  }

  enqueue(name: string, payload: R) {
    const queue = this._createIfNotExists(name);

    queue.enqueue(payload);
  }
}
