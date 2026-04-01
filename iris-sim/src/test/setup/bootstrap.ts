import './open_handle_patch.js';
import './global_teardown.js';

process.on('unhandledRejection', (err) => {
  console.error('[IRIS TEST] UnhandledRejection', err);
  process.exitCode = 1;
});

process.on('uncaughtException', (err) => {
  console.error('[IRIS TEST] UncaughtException', err);
  process.exitCode = 1;
});
