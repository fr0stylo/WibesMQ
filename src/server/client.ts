import { BaseClient } from '../base/client.js';
import { MessageFrame } from '../types.js';
import { CreateQueueRequest, EnqueueRequest, ErrorResponse, MessageType, SubscribeRequest, SubscribeResponse } from './types.js';

export class QueueClient extends BaseClient<MessageType> {
  constructor(...props: any) {
    super(props);
  }

  async ack(messageID: string) {
    return this._writeMessage(MessageType.ack, {}, { ct: Date.now() }, messageID);
  }

  async nack(messageID: string) {
    return this._writeMessage(MessageType.ack, {}, { ct: Date.now() }, messageID);
  }

  async createQueue(name: string) {
    const resultOrError = await this._rpc<CreateQueueRequest, ErrorResponse | {}>(MessageType.createQueue, { name: name }, { ct: Date.now() });
    const result = throwOnError(resultOrError);

    return result;
  }

  async enqueue<T>(name: string, payload: T) {
    const resultOrError = await this._rpc<EnqueueRequest, ErrorResponse | {}>(MessageType.enqueue, { name: name, payload }, { ct: Date.now() });
    const result = throwOnError(resultOrError);

    return result;
  }

  async consume<T>(name: string, handler: (x: T) => Promise<void>) {
    this.event.once(name, async (x) => {
      const {
        data,
        metadata: { response },
      } = x;

      try {
        await handler(data);
        await this.ack(response);
      } catch {
        await this.nack(response);
      }

      return this.consume(name, handler);
    });

    const resultOrError = await this._rpc<SubscribeRequest, ErrorResponse | MessageFrame<SubscribeResponse>>(
      MessageType.subscribe,
      { name: name },
      { ct: Date.now() },
    );
    throwOnError(resultOrError);

    return;
  }
}

function throwOnError<T>(un: ErrorResponse | T): T {
  if ((<ErrorResponse>un).error) {
    throw (<ErrorResponse>un).error;
  }

  return un as T;
}
