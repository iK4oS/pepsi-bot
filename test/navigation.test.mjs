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
