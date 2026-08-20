import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { centeredColumnCount, masonryLayout } from '../public/layout.js';

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

test('collage uses packed masonry without deferred-size placeholders', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const collage = css.match(/\.collage\s*\{([^}]*)\}/)?.[1] ?? '';
  const post = css.match(/\.post\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(collage, /position:\s*relative/);
  assert.doesNotMatch(collage, /column-count|grid-template-columns/);
  assert.match(post, /position:\s*absolute/);
  assert.doesNotMatch(post, /content-visibility|contain-intrinsic-size/);
  assert.match(app, /masonryLayout/);
  assert.match(app, /style\.transform\s*=\s*`translate3d/);
});

test('reserves the initial viewport so asynchronous gallery insertion does not shift the footer', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const main = css.match(/main\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(main, /min-height:\s*calc\(100(?:s|d)?vh\s*-\s*72px\)/);
});

test('masonry packs each post into the shortest column without row gaps', () => {
  const result = masonryLayout([300, 120, 220, 180, 160, 90, 140], 3, 200, 16);
  assert.deepEqual(result.items, [
    { column: 0, x: 0, y: 0 },
    { column: 1, x: 216, y: 0 },
    { column: 2, x: 432, y: 0 },
    { column: 1, x: 216, y: 136 },
    { column: 2, x: 432, y: 236 },
    { column: 0, x: 0, y: 316 },
    { column: 1, x: 216, y: 332 }
  ]);
  assert.equal(result.height, 472);
});
