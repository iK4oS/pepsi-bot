import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesPost } from '../public/search.js';

const post = { id: '1539380525205295104', text: 'Golden Hour by the lake' };

test('search matches message IDs', () => {
  assert.equal(matchesPost(post, '1539380525'), true);
  assert.equal(matchesPost(post, '999999'), false);
});

test('search matches titles case-insensitively', () => {
  assert.equal(matchesPost(post, 'golden hour'), true);
  assert.equal(matchesPost(post, 'GOLDEN'), true);
});

test('blank search shows every post', () => {
  assert.equal(matchesPost(post, '   '), true);
});
