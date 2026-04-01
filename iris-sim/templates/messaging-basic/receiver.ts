import { IrisNode } from 'iris';

async function main() {
  const node = new IrisNode();

  node.on('message', (msg) => {
    console.log('📩 Received:', msg);
  });

  await node.start();
}

void main();
