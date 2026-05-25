// Copia o output do Vite (Backend_Cloud/public) para dashboard/dist
// Necessário porque o Capacitor não suporta webDir com path ../.. (sai do project root)
import { existsSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = resolve(__dirname, '..');
const src = resolve(dashboardRoot, '../../Backend_Cloud/public');
const dest = resolve(dashboardRoot, 'dist');

if (!existsSync(src)) {
  console.error(`[copy-to-dist] Source não existe: ${src}`);
  console.error('[copy-to-dist] Corre "npm run build" antes deste script.');
  process.exit(1);
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-to-dist] ${src} → ${dest}`);
