import fs from 'fs';
import path from 'path';

/**
 * Returns the secure server-only data directory (outside the public directory).
 * Reliably resolves whether running from the repository root or the app subdirectory.
 */
export function getDataDir(): string {
  // If cwd is already inside amway-store
  if (
    fs.existsSync(path.join(process.cwd(), 'next.config.ts')) ||
    fs.existsSync(path.join(process.cwd(), 'next.config.mjs')) ||
    fs.existsSync(path.join(process.cwd(), 'next.config.js'))
  ) {
    const secureDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(secureDir)) {
      try {
        fs.mkdirSync(secureDir, { recursive: true });
      } catch (e) {
        console.error('[dataPath] Error creating secure data directory:', e);
      }
    }
    return secureDir;
  }

  // If cwd is the parent workspace (e.g. E:\NSquare)
  if (fs.existsSync(path.join(process.cwd(), 'amway-store', 'data'))) {
    return path.join(process.cwd(), 'amway-store', 'data');
  }

  const defaultDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch (e) {
      console.error('[dataPath] Error creating secure data directory:', e);
    }
  }
  return defaultDir;
}

/**
 * Returns the file path for a dataset inside the secure data directory.
 * Automatically checks and safely migrates from legacy public/data if present.
 */
export function getDataFilePath(filename: string): string {
  const secureDir = getDataDir();
  const securePath = path.join(secureDir, filename);

  if (fs.existsSync(securePath)) {
    return securePath;
  }

  // Fallback / auto-migration from legacy public/data or secondary paths if present
  const legacyCandidates = [
    path.join(secureDir, '..', 'public', 'data', filename),
    path.join(process.cwd(), 'amway-store', 'public', 'data', filename),
    path.join(process.cwd(), 'public', 'data', filename),
    path.join(process.cwd(), 'data', filename),
  ];

  for (const cand of legacyCandidates) {
    if (fs.existsSync(cand) && cand !== securePath) {
      try {
        fs.copyFileSync(cand, securePath);
        return securePath;
      } catch (e) {
        return cand;
      }
    }
  }

  return securePath;
}

/**
 * Atomic JSON file writer.
 * Writes to a temporary file first and renames it to prevent file corruption
 * during concurrent operations or sudden crashes.
 */
export function atomicWriteJson(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (e) {}
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

