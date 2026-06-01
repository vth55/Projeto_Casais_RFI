import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const assetsDir = resolve(import.meta.dirname, '../../../Backend_Cloud/public/assets');

// The hosting output lives outside this package, so Vite cannot reliably clear it.
rmSync(assetsDir, { recursive: true, force: true });
