import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Cloudflare build stamps the deployed revision into static assets', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const buildScript = await readFile(new URL('../scripts/build-info.mjs', import.meta.url), 'utf8');
  const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts.build, 'node scripts/build-info.mjs');
  assert.match(wrangler, /"command"\s*:\s*"npm run build"/);
  assert.match(wrangler, /"directory"\s*:\s*"\.\/public"/);
  assert.match(buildScript, /WORKERS_CI_COMMIT_SHA/);
  assert.match(gitignore, /public\/build-info\.json/);
});
