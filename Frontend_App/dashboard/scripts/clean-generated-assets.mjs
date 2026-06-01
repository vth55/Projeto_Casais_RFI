import { existsSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const assetsDir = resolve(import.meta.dirname, '../../../Backend_Cloud/public/assets');

// The hosting output lives outside this package, so Vite cannot reliably clear it.
if (existsSync(assetsDir)) {
  for (const entry of readdirSync(assetsDir, { withFileTypes: true })) {
    const path = join(assetsDir, entry.name);
    if (entry.isDirectory()) rmSync(path, { recursive: true, force: true });
    else unlinkSync(path);
  }
}
