export type PendingQueueItem<T> = {
  data: T;
  metadata: Omit<QueueEntry<T>, 'payload'>;
  ack: () => void;
  nack: () => void;
};
export type QueueEntry<T> = { payload: T; enqueued: number; retried: number; messageID: string };

export type GenericQueue<T> = {
  enqueue(item: T): void;
  dequeue(): PendingQueueItem<T> | undefined;
  load(items: QueueEntry<T>[]): void;
  size(): number;
};
