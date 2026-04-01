import { IrisNode } from 'iris';

async function main() {
  const node = new IrisNode();

  node.on('message', (msg) => {
    console.log('📩 Sender received (loopback):', msg);
  });

  await node.start();

  setInterval(() => {
    void node.send({
      type: 'PING',
      payload: { time: Date.now() },
    });
  }, 2000);
}

void main();
