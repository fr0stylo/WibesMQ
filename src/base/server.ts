import { createServer, Server, Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { ReadTransformer, WriteTransformer } from '../transformer.js';
import { Writable } from 'node:stream';

export type Connection = { socket: Socket; writer: WriteTransformer };
export type ServerProps = Partial<{ port: number }>;

export abstract class BaseServer<MF> {
  protected server: Server = createServer({ keepAlive: true, noDelay: true });
  protected connections: Map<string, Connection> = new Map();
  private port: number;

  constructor(props: ServerProps = {}) {
    this.port = props.port || 9090;
    this.server.on('connection', this.handleConnection.bind(this));
    this.server.on('error', this.handleError.bind(this));
  }

  protected async _streamWrite<T>(s: Writable, payload: MF) {
    return new Promise((res, rej) =>
      s.write(payload, (err: any) => {
        err ? rej(err) : res({});
      }),
    );
  }

  abstract handleMessageFrame(c: Connection, connectionID: string, payload: MF): Promise<void>;

  private handleError(error: { code: string }) {
    if (error.code === 'EADDRINUSE') {
      console.error('Address in use');
    }
  }

  private closeHandle(connectionID: string) {
    this.connections.delete(connectionID);
    console.info(`[${connectionID}] disconnected`);
  }

  private async handleConnection(c: Socket) {
    const reader = new ReadTransformer<MF>();
    const writer = new WriteTransformer();
    const connectionID = randomUUID();

    this.connections.set(connectionID, { socket: c, writer });
    console.info(`[${connectionID}] connected`);

    c.on('close', () => this.closeHandle(connectionID));
    c.on('error', (err: { code: string }) => this.handleError(err));
    c.pipe(reader);
    writer.pipe(c);
    reader.on('error', (err: { code: string }) => this.handleError(err));

    for await (const data of reader) {
      performance.mark('message:start');
      await this.handleMessageFrame({ socket: c, writer }, connectionID, data as MF);
      performance.mark('message:end');

      const measure = performance.measure('Message performance', 'message:start', 'message:end');
      console.debug(`[${connectionID}][${measure.duration} ms]`);
    }
  }

  public async start() {
    await new Promise((res, rej) =>
      this.server.listen(this.port, () => {
        console.info(`Listening on: ${this.port}`);
        res({});
      }),
    );
  }

  public stop() {
    this.server.close(() => {
      console.info('Server stopped');
    });
  }
}
