import { dirname } from 'node:path';
import { mkdir, open, rename } from 'node:fs/promises';

export async function writeFileAtomic(path: string, data: string): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const tempPath = `${path}.tmp`;
  const file = await open(tempPath, 'w');
  try {
    await file.writeFile(data, 'utf8');
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(tempPath, path);
}
