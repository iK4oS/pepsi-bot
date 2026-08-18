import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('homepage exposes a complete Discord social card', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const expected of [
    'property="og:type" content="website"',
    'property="og:title" content="Pepsi Cat / Archive"',
    'property="og:url" content="https://pepsicat.photos/"',
    'property="og:image" content="https://pepsicat.photos/social-card.jpg"',
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'name="twitter:card" content="summary_large_image"'
  ]) assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
