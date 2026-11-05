import path from 'node:path';
import { app } from 'electron';

/** Absolute path to a file in `assets/` (shipped as an extra resource when packaged). */
export function assetPath(file: string): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(app.getAppPath(), 'assets');
  return path.join(base, file);
}
