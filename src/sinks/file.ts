import { createWriteStream, statSync, appendFileSync } from 'node:fs';
import { createGzip } from 'node:zlib';

export function createFileSink(path: string, opts?: Partial<{ compress: boolean; flags: string }>) {
  if (!statSync(path, { throwIfNoEntry: false })) {
    appendFileSync(path, '');
  }
  const compressor = createGzip();
  const fs = createWriteStream(path, { flags: opts?.flags || 'r+' });
  compressor.pipe(fs);

  return opts?.compress ? compressor : fs;
}
