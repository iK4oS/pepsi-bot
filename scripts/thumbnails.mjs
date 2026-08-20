import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

export function thumbnailRelativePath(mediaSrc) {
  const normalized = mediaSrc.replace(/^\//, '');
  const parsed = path.posix.parse(normalized);
  return path.posix.join(parsed.dir, 'thumbnails', `${parsed.name}.webp`);
}

export async function ensureThumbnail(inputPath, outputPath, kind, run = execFileAsync) {
  try {
    if ((await stat(outputPath)).size > 0) return false;
  } catch {}

  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${randomUUID()}.tmp.webp`;
  const seek = kind === 'video' ? ['-ss', '0.1'] : [];
  try {
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      ...seek,
      '-i', inputPath,
      '-vf', 'scale=720:720:force_original_aspect_ratio=decrease',
      '-frames:v', '1',
      '-c:v', 'libwebp',
      '-quality', '52',
      temporaryPath
    ]);
    if ((await stat(temporaryPath)).size === 0) throw new Error('thumbnail encoder produced an empty file');
    await rename(temporaryPath, outputPath);
    return true;
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function thumbnailMetadata(inputPath, publicRoot, mediaSrc, kind, generate = ensureThumbnail, warn = console.warn) {
  const thumbnailSrc = thumbnailRelativePath(mediaSrc);
  try {
    await generate(inputPath, path.join(publicRoot, thumbnailSrc), kind);
    return { thumbnailSrc };
  } catch (error) {
    warn(`Could not generate thumbnail for ${mediaSrc}: ${error.message}`);
    return {};
  }
}
