import { IrisNode } from 'iris';

async function main() {
  const node = new IrisNode();

  node.on('node:ready', () => {
    console.log('🚀 IRIS Hello World running');
  });

  node.on('message', (msg) => {
    console.log('📩 Message received:', msg);
  });

  await node.start();

  // Automatic demo send (loopback receive on same node)
  setTimeout(async () => {
    await node.send({
      type: 'HELLO',
      payload: {
        message: 'Hello from IRIS',
      },
    });
  }, 1000);
}

void main();
