import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Detects whether the current process is running in a serverless environment
 * with a read-only filesystem (e.g. Vercel, AWS Lambda, Netlify functions).
 */
export function isServerlessEnvironment(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NETLIFY ||
    process.env.NOW_REGION
  );
}

/**
 * Returns the writable directory for data storage.
 * In serverless (Vercel / Lambda), this returns /tmp/nsquare_data.
 * In local development or full servers, this returns the persistent ./data folder.
 */
export function getWritableDataDir(): string {
  if (isServerlessEnvironment()) {
    const tmpDataDir = path.join(os.tmpdir(), 'nsquare_data');
    if (!fs.existsSync(tmpDataDir)) {
      try {
        fs.mkdirSync(tmpDataDir, { recursive: true });
      } catch (e) {
        console.error('[dataPath] Error creating tmp data directory:', e);
      }
    }
    return tmpDataDir;
  }

  return getBaseDataDir();
}

/**
 * Returns the base bundled data directory containing the seed data files.
 */
export function getBaseDataDir(): string {
  // If cwd is already inside amway-store
  if (
    fs.existsSync(path.join(process.cwd(), 'next.config.ts')) ||
    fs.existsSync(path.join(process.cwd(), 'next.config.mjs')) ||
    fs.existsSync(path.join(process.cwd(), 'next.config.js'))
  ) {
    const secureDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(secureDir) && !isServerlessEnvironment()) {
      try {
        fs.mkdirSync(secureDir, { recursive: true });
      } catch (e) {}
    }
    return secureDir;
  }

  // If cwd is the parent workspace (e.g. E:\NSquare)
  if (fs.existsSync(path.join(process.cwd(), 'amway-store', 'data'))) {
    return path.join(process.cwd(), 'amway-store', 'data');
  }

  return path.join(process.cwd(), 'data');
}

/**
 * Backwards compatibility alias for getBaseDataDir.
 */
export function getDataDir(): string {
  return getBaseDataDir();
}

/**
 * Returns the file path for a dataset.
 * In serverless environments, it first checks if a mutated version exists in /tmp.
 * If so, it returns that. Otherwise, it returns the bundled seed file.
 */
export function getDataFilePath(filename: string): string {
  // 1. If running in serverless, check if the mutated file exists in /tmp
  if (isServerlessEnvironment()) {
    const tmpFilePath = path.join(os.tmpdir(), 'nsquare_data', filename);
    if (fs.existsSync(tmpFilePath)) {
      return tmpFilePath;
    }
  }

  // 2. Check the primary bundled data directory
  const baseDir = getBaseDataDir();
  const basePath = path.join(baseDir, filename);
  if (fs.existsSync(basePath)) {
    return basePath;
  }

  // 3. Fallbacks for alternative directories
  const candidates = [
    path.join(process.cwd(), 'amway-store', 'data', filename),
    path.join(process.cwd(), 'data', filename),
    path.join(baseDir, '..', 'public', 'data', filename),
    path.join(process.cwd(), 'amway-store', 'public', 'data', filename),
    path.join(process.cwd(), 'public', 'data', filename),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }

  return basePath;
}

/**
 * Atomic JSON file writer.
 * Handles serverless read-only filesystems (Vercel) by redirecting writes to /tmp.
 * Prevents file corruption using atomic write & rename.
 */
export function atomicWriteJson(filePath: string, data: any): void {
  const filename = path.basename(filePath);
  let targetPath = filePath;

  // In serverless, or if target is under /var/task, always write to /tmp
  if (isServerlessEnvironment() || targetPath.startsWith('/var/task')) {
    const tmpDataDir = getWritableDataDir();
    targetPath = path.join(tmpDataDir, filename);
  }

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }

  const tmpPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  } catch (err: any) {
    // If writing to the primary path failed with EROFS (read-only filesystem), retry writing to /tmp
    if (err && (err.code === 'EROFS' || err.code === 'EACCES') && !targetPath.includes(os.tmpdir())) {
      try {
        const fallbackPath = path.join(os.tmpdir(), 'nsquare_data', filename);
        const fallbackDir = path.dirname(fallbackPath);
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf-8');
        return;
      } catch (fallbackErr) {
        console.error(`[dataPath] Fallback /tmp write failed for ${filename}:`, fallbackErr);
      }
    }

    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (e) {}

    try {
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (writeErr) {
      console.error(`[dataPath] Final write failed for ${filename}:`, writeErr);
    }
  }
}
