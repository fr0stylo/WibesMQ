import { Readable, Transform, TransformCallback, Writable } from 'node:stream';
import { appendFileSync, createReadStream, createWriteStream, statSync } from 'node:fs';
import { createGunzip, createGzip } from 'node:zlib';

async function writeToStream(stream: Writable, payload: any) {
  return new Promise((res, rej) => {
    stream.write(payload, (err) => {
      err ? rej(err) : res({});
    });
  });
}

export type Sinkable = { push: (entry: WALEntry<unknown>) => Promise<void> };
export class WALManager {
  private wal: Writable;
  private timer: NodeJS.Timeout;

  constructor(
    private walPath: string,
    private snapshotPath: string,
  ) {
    this._loadSnapshot = this._loadSnapshot.bind(this);
    this._generateSnapshotEntries = this._generateSnapshotEntries.bind(this);

    this.wal = this._createFileSink(this.walPath);

    this.timer = setInterval(async () => {
      const entries = await this._generateSnapshotEntries();
      await this._loadSnapshot(entries);
    }, 30 * 1000);
  }

  async _loadSnapshot<T>(items: WALEntry<T>[]) {
    this.wal = this._createFileSink(this.walPath, { flags: 'w' });
    const stream = this._createFileSink(this.snapshotPath, { flags: 'w' });
    for (const entry of items) {
      await writeToStream(stream, `${entry.type}\0${entry.queue}\0${entry.messageID}\0${entry.enqueued}\0${JSON.stringify(entry.payload)}\n`);
    }
  }

  async push<T>(entry: WALEntry<T>) {
    await writeToStream(this.wal, `${entry.type}\0${entry.queue}\0${entry.messageID}\0${entry.enqueued}\0${JSON.stringify(entry.payload)}\n`);
  }

  private async _generateSnapshotEntries<T>() {
    const messages: WALEntry<T>[] = [];
    const acked = new Set<string>();
    for await (const item of this._read(this.snapshotPath)) {
      messages.push({ ...item, payload: JSON.parse(item.payload) });
    }
    for await (const item of this._read(this.walPath)) {
      switch (item.type) {
        case 'ENQUEUE':
          messages.push({ ...item, payload: JSON.parse(item.payload) });
          break;
        case 'ACK':
          acked.add(item.messageID);
          break;
      }
    }

    return messages.filter((x) => !acked.has(x.messageID));
  }

  async loadSnapshot<T>() {
    const entries = await this._generateSnapshotEntries<T>();
    await this._loadSnapshot(entries);

    return entries.map((x) => ({ payload: x.payload, queue: x.queue }));
  }

  private _read(path: string, opts?: Partial<{ compress: boolean }>) {
    if (!statSync(path, { throwIfNoEntry: false })) {
      appendFileSync(path, '');
    }

    let reader: Readable = createReadStream(path);
    const transform = new WALTransformer();
    if (opts?.compress) {
      const compressor = createGunzip();
      reader = reader.pipe(compressor);
    }

    reader.pipe(transform);
    return transform;
  }

  private _createFileSink(path: string, opts?: Partial<{ compress: boolean; flags: string }>) {
    if (!statSync(path, { throwIfNoEntry: false })) {
      appendFileSync(path, '');
    }
    const compressor = createGzip();
    const fs = createWriteStream(path, { flags: opts?.flags || 'r+' });
    compressor.pipe(fs);

    return opts?.compress ? compressor : fs;
  }
}

type WALEntry<T> = {
  type: string;
  queue: string;
  messageID: string;
  enqueued: number;
  payload: T;
};

class WALTransformer extends Transform {
  private buffer = '';
  constructor() {
    super({ readableObjectMode: true });
  }

  _transform<T>(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    const data = this.buffer + chunk.toString();
    const lines = data.split('\n');

    lines.slice(0, -1).forEach((x) => {
      const [type, queue, messageID, enqueued, ...payload] = x.trim().split('\0');

      this.push({
        type,
        queue,
        messageID,
        enqueued: parseInt(enqueued, 10),
        payload: payload.at(0),
      } as WALEntry<T>);
    });

    this.buffer = lines.at(-1) || '';

    callback();
  }

  _flush(callback: TransformCallback): void {
    callback();
  }
}
