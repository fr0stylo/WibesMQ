import { connect, Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { setTimeout } from 'node:timers/promises';

import { ReadTransformer, WriteTransformer } from '../transformer.js';
import { MessageFrame } from '../types.js';

class TimeoutError extends Error {}
class NotInitializedError extends Error {}

type ClientOpts = {
  port: number;
  host: string;
  retryCount: number;
};
export abstract class BaseClient<MT, MD = { ct: number }> {
  private sck?: Socket;
  protected event = new EventEmitter();
  private reader = new ReadTransformer();
  private writter = new WriteTransformer();
  private options: ClientOpts = { port: 9090, host: '127.0.0.1', retryCount: 5 };

  private retryCount = 0;

  constructor(options: Partial<ClientOpts> = {}) {
    this.options = { ...this.options, ...options };
    this.reader.on('data', (x) => this._handleRaw(x));
  }

  private _handleRaw(payload: MessageFrame<MT>) {
    this.event.emit(payload.messageID, payload);
  }

  protected async _writeMessage<P = any>(type: MT, data: P, metadata: MD, messageID: string = randomUUID()) {
    if (!this.sck) {
      throw new NotInitializedError();
    }

    await new Promise((res, rej) => {
      this.writter.write({ messageID, type, data, metadata }, (err) => {
        err ? rej(err) : res({});
      });
    });

    return messageID;
  }

  async _rpc<T, O>(type: MT, data: T, metadata: MD): Promise<O> {
    const messageID = await this._writeMessage(type, data, metadata);
    return new Promise<O>((res) => this.event.once(messageID, res));
  }

  private async _onError(err: { code: string }) {
    if (err.code === 'ECONNREFUSED' && this.retryCount < this.options.retryCount) {
      console.info('Scheduling connection retry');
      await setTimeout(1000 * (this.retryCount + 1));
      return this.connect();
    }

    console.log(err);
  }

  async connect(): Promise<this> {
    return new Promise((res, rej) => {
      this.sck = connect({
        port: this.options.port!,
        host: this.options.host!,
        keepAlive: true,
        keepAliveInitialDelay: 5,
        noDelay: true,
      });
      this.sck.once('error', rej);
      this.sck.once('connect', () => {
        res(this);
      });
      this.sck.pipe(this.reader);
      this.writter.pipe(this.sck);
    });
  }

  close() {
    this.sck?.end();
  }
}
