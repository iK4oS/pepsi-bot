import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { centeredColumnCount } from '../public/layout.js';

test('centers small collections without reserving empty outer columns', () => {
  assert.equal(centeredColumnCount(1, 1600), 1);
  assert.equal(centeredColumnCount(6, 1440), 3);
  assert.equal(centeredColumnCount(10, 1440), 4);
});

test('caps columns for narrow viewports', () => {
  assert.equal(centeredColumnCount(30, 500), 1);
  assert.equal(centeredColumnCount(30, 700), 2);
  assert.equal(centeredColumnCount(30, 1000), 3);
});

test('collage uses a row-major grid without deferred-size placeholders', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const collage = css.match(/\.collage\s*\{([^}]*)\}/)?.[1] ?? '';
  const post = css.match(/\.post\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(collage, /display:\s*grid/);
  assert.match(collage, /grid-template-columns:\s*repeat\(var\(--columns\),\s*minmax\(0,\s*1fr\)\)/);
  assert.doesNotMatch(collage, /column-count/);
  assert.doesNotMatch(post, /content-visibility|contain-intrinsic-size/);
});
