import test from 'node:test';
import assert from 'node:assert/strict';
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
