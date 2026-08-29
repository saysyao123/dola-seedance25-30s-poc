import { resolve } from 'node:path';
import { startObserver } from './browser/observe.js';

const command = process.argv[2] ?? 'observe';

if (command !== 'observe') {
  console.error(`Unknown command: ${command}`);
  console.error('Available command: observe');
  process.exit(1);
}

const dolaUrl = process.env.DOLA_URL ?? 'https://www.dola.com/';
const profileDir = process.env.DOLA_PROFILE_DIR ?? './user-data/dola-poc';
const captureDir = process.env.CAPTURE_DIR ?? './captures/raw';
const captureFile = resolve(captureDir, `dola-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);

const context = await startObserver({
  dolaUrl,
  profileDir,
  captureFile,
});

await new Promise<void>((resolveDone) => {
  context.on('close', () => resolveDone());
  process.on('SIGINT', async () => {
    await context.close();
    resolveDone();
  });
});
