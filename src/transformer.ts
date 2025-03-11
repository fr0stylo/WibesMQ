import { Transform, TransformCallback } from 'node:stream';

export class ReadTransformer<T> extends Transform {
  buffer: string = '';

  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    const data = this.buffer + chunk.toString();
    const lines = data.split('\0\0');
    lines.slice(0, -1).forEach((x) => {
      this.push(JSON.parse(x.trim()));
    });

    this.buffer = lines.at(-1) || '';
    callback();
  }

  _flush(callback: TransformCallback): void {
    callback();
  }
}

export class WriteTransformer extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    this.push(JSON.stringify(chunk) + '\0\0');
    callback();
  }

  _flush(callback: TransformCallback): void {
    callback();
  }
}
