import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('header exposes scoped archive links and a Pepsi favicon', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const expected of ['href="/favicon.svg"', 'href="/" data-route="archive"', 'href="/food" data-route="food"', 'href="/pets" data-route="pets"']) {
    assert.ok(html.includes(expected), `Missing ${expected}`);
  }
});

test('route shells stay identical to the main archive page', async () => {
  const root = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const route of ['archive', 'Archive', 'food', 'pets']) {
    assert.equal(await readFile(new URL(`../public/${route}.html`, import.meta.url), 'utf8'), root);
  }
});

test('fullscreen videos use contain sizing', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /video:fullscreen[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /video:-webkit-full-screen[\s\S]*?object-fit:\s*contain/);
});

test('thumbnail interaction targets a full-resolution link', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(app, /document\.createElement\('a'\)/);
  assert.match(app, /link\.href\s*=\s*fullSrc/);
  assert.match(app, /if \(!shouldOpenImageLightbox\(event\)\) return/);
  assert.match(app, /event\.preventDefault\(\)[\s\S]*openLightbox/);
  assert.match(css, /\.image-link\s+img\s*\{[^}]*pointer-events:\s*none/);
});

test('scheduled sync uses the archive guild ID', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync.yml', import.meta.url), 'utf8');
  assert.match(workflow, /DISCORD_GUILD_ID:\s*["']731881028573986874["']/);
  assert.doesNotMatch(workflow, /828022955875368981/);
});

test('content security policy permits Discord attachment fallbacks', async () => {
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /img-src[^;]*https:\/\/cdn\.discordapp\.com[^;]*https:\/\/media\.discordapp\.net/);
  assert.match(headers, /media-src[^;]*https:\/\/cdn\.discordapp\.com[^;]*https:\/\/media\.discordapp\.net/);
});
