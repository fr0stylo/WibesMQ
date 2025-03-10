import { setTimeout } from 'node:timers/promises';
import { QueueClient } from '../src/server/client';

let queue = new QueueClient();
queue = await queue.connect();

await queue.createQueue('queue:listener:2');
await queue.consume('queue:listener:2', async (x: { payload: string }) => {
  console.log(x);
  await setTimeout(Math.random() * 2000);
});
