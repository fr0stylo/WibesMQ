import { QueueClient } from '../src/server/client';

let queue = new QueueClient();
queue = await queue.connect();

await queue.createQueue('queue:listener:2');

setInterval(async () => {
  await queue.enqueue(`queue:listener:2`, { payload: 'Huge ballz' });
}, Math.random() * 2000);
