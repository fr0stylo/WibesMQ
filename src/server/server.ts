import { Writable } from 'node:stream';

import { GenericQueue, QueueEmit } from '../queue/index.js';
import { Connection, CreateQueueRequest, EnqueueRequest, MessageFrame, MessageType, ServerProps, SubscribeRequest } from './types.js';
import { BaseServer } from '../base/server.js';
import { QueueManager } from '../queue/manager.js';

export class QueueServer extends BaseServer<MessageFrame> {
  constructor(
    props?: ServerProps,
    private queueManager = new QueueManager<unknown, { connectionID: string }>(),
  ) {
    super(props);
    this._handleQueueEvent = this._handleQueueEvent.bind(this);
    this.queueManager.onQueueEventListener = this._handleQueueEvent;
  }

  private async _handleQueueEvent(ev: QueueEmit<unknown>, subscriberId: string, queue: GenericQueue<unknown>): Promise<void> {
    if (this.connections.has(subscriberId)) {
      const { socket, writer } = this.connections.get(subscriberId)!;
      const item = queue.dequeue()!;
      socket.once(item.metadata.messageID, async (x: MessageFrame) => {
        switch (x.type) {
          case MessageType.nack:
            item.nack();
          case MessageType.ack:
            item.ack();
            break;
          default:
            console.error(`Unknown response`, x);
        }
      });

      await this._streamWrite(writer, {
        type: MessageType.subscribe,
        data: item,
        messageID: ev.name,
        metadata: { response: item.metadata.messageID },
      });
    }
  }

  private async _handleSubscription(c: Writable, connectionID: string, { data, messageID }: MessageFrame<SubscribeRequest>) {
    this.queueManager.subscribe(data.name, connectionID);

    return this._streamWrite(c, { type: MessageType.ack, data: undefined, messageID, metadata: {} });
  }

  private async _handleCreateQueue(c: Writable, { data, messageID }: MessageFrame<CreateQueueRequest>) {
    this.queueManager.createQueue(data.name);

    return this._streamWrite(c, { type: MessageType.ack, data: undefined, messageID, metadata: {} });
  }

  private async _handleEnquque(c: Writable, { data, messageID }: MessageFrame<EnqueueRequest>) {
    this.queueManager.enqueue(data.name, data.payload);

    return this._streamWrite(c, { type: MessageType.ack, data: undefined, messageID, metadata: {} });
  }

  override async handleMessageFrame({ socket, writer }: Connection, connectionID: string, payload: MessageFrame): Promise<void> {
    switch (payload.type) {
      case MessageType.createQueue:
        await this._handleCreateQueue(writer, payload);
        return;
      case MessageType.enqueue:
        await this._handleEnquque(writer, payload);
        return;
      case MessageType.subscribe:
        await this._handleSubscription(writer, connectionID, payload);
        return;
      case MessageType.ack:
      case MessageType.nack:
        socket.emit(payload.messageID, payload);
        return;
      default:
        console.error(`Unimplemented method ${payload.type}`);
    }
  }

  public start(): Promise<void> {
    this.queueManager.load();

    return super.start();
  }
}
