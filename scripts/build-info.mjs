import { execFile as execFileCallback } from 'node:child_process';
import { writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createBuildInfoDocument({ sha, date }) {
  if (!/^[0-9a-f]{40}$/i.test(sha ?? '')) throw new Error('Invalid deployment revision');
  const parsedDate = new Date(date);
  if (!date || Number.isNaN(parsedDate.getTime())) throw new Error('Invalid deployment revision date');
  return `${JSON.stringify({ sha, date: parsedDate.toISOString() }, null, 2)}\n`;
}

async function git(...args) {
  const { stdout } = await execFile('git', args, { cwd: ROOT });
  return stdout.trim();
}

export async function writeBuildInfo({
  sha = process.env.WORKERS_CI_COMMIT_SHA,
  outputPath = process.env.BUILD_INFO_OUTPUT || path.join(ROOT, 'public', 'build-info.json')
} = {}) {
  const revision = sha || await git('rev-parse', 'HEAD');
  const date = await git('show', '-s', '--format=%cI', revision);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, createBuildInfoDocument({ sha: revision, date }), 'utf8');
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return { sha: revision, date: new Date(date).toISOString(), outputPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  writeBuildInfo()
    .then(({ sha, date, outputPath }) => console.log(`Build metadata: ${sha.slice(0, 8)} @ ${date} -> ${outputPath}`))
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
