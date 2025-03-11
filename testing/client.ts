import { setTimeout } from 'node:timers/promises';

import { QueueClient } from '../src/server/client';

// let queue = new QueueClient();
// queue = await queue.connect();

// // await queue.createQueue('queue:listener:1');
// await queue.createQueue('queue:listener:2');

// await queue.consume('queue:listener:2', async (x: { payload: string }) => {
//   console.log(x);
//   await setTimeout(Math.random() * 2000);
// });

async function consumer(i: number) {
  let queue = new QueueClient();
  queue = await queue.connect();

  await queue.consume(`queue:listener:${i % 3}`, async (x: { payload: string }) => {
    // console.log(`Consumer: ${i}: `, x);
    await setTimeout(Math.random() * 1000);
  });

  return;
}

async function publisher(i: number) {
  let queue = new QueueClient();
  queue = await queue.connect();

  await queue.createQueue(`queue:listener:${i % 15}`);

  setInterval(async () => {
    await queue.enqueue(`queue:listener:${i % 15}`, { payload: 'Huge ballz' });
  }, Math.random() * 2000);

  return;
}

await Promise.all([...new Array(1).fill(1).map((_, i) => publisher(i + 1)), ...new Array(16).fill(1).map((_, i) => consumer(i + 1))]);
