import { EmitingQueue } from './emitting.js';
import { QueueEntry } from './types.js';
import { Sinkable } from './wal.js';

export class DurableQueue<T> extends EmitingQueue<T> {
  constructor(private sink: Sinkable, ...props: any) {
    super(...props);
  }

  nack(msg: QueueEntry<T>): void {
    this.sink.push({
      enqueued: msg.enqueued,
      messageID: msg.messageID,
      queue: this.name,
      type: 'NACK',
      payload: msg,
    });
    super.ack(msg);
  }

  ack(msg: QueueEntry<T>): void {
    this.sink.push({
      enqueued: msg.enqueued,
      messageID: msg.messageID,
      queue: this.name,
      type: 'ACK',
      payload: msg,
    });
    super.ack(msg);
  }

  _enqueue(msg: QueueEntry<T>): void {
    this.sink.push({
      enqueued: msg.enqueued,
      messageID: msg.messageID,
      queue: this.name,
      type: 'ENQUEUE',
      payload: msg,
    });

    super._enqueue(msg);
  }
}
