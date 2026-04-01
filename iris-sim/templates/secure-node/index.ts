import { IrisBuilder } from 'iris';

async function main() {
  const node = IrisBuilder.create()
    .enableDefaults()
    .enableEncryption(true)
    .build();

  node.on('node:ready', () => {
    console.log('🔐 IRIS Secure Node running (encryption enabled)');
  });

  node.on('message', (msg) => {
    console.log('📩 Message received:', msg);
  });

  await node.start();

  setTimeout(async () => {
    await node.send({
      type: 'SECURE_PING',
      payload: { ok: true },
    });
  }, 1_000);
}

void main();
