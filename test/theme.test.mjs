import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTheme, nextTheme, syncDarkReaderLock } from '../public/theme.js';

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

test('Dark Reader is locked only while the native dark theme is active', () => {
  let lock = null;
  const colorScheme = { content: '' };
  const root = {
    head: { append(node) { lock = node; } },
    querySelector(selector) {
      if (selector === 'meta[name="darkreader-lock"]') return lock;
      if (selector === 'meta[name="color-scheme"]') return colorScheme;
      assert.fail(`Unexpected selector: ${selector}`);
    },
    createElement(tag) {
      assert.equal(tag, 'meta');
      return { name: '', remove() { lock = null; } };
    }
  };

  syncDarkReaderLock('dark', root);
  assert.equal(lock.name, 'darkreader-lock');
  assert.equal(colorScheme.content, 'dark');
  syncDarkReaderLock('dark', root);
  assert.equal(lock.name, 'darkreader-lock');
  syncDarkReaderLock('light', root);
  assert.equal(lock, null);
  assert.equal(colorScheme.content, 'light');
});
