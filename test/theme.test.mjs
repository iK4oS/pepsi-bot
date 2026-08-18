import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTheme, nextTheme } from '../public/theme.js';

test('dark is the default theme', () => {
  assert.equal(initialTheme(null), 'dark');
  assert.equal(initialTheme('unknown'), 'dark');
});

test('a valid saved theme is restored', () => {
  assert.equal(initialTheme('light'), 'light');
  assert.equal(initialTheme('dark'), 'dark');
});

test('theme toggle switches between dark and light', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});
