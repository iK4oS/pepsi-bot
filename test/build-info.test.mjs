import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInfoPayload } from '../public/build-info.js';

test('formats the deployed GitHub revision and commit date for the footer', () => {
  assert.deepEqual(buildInfoPayload({
    sha: '1fe3af2f0123456789abcdef0123456789abcdef',
    date: '2026-05-05T14:03:00Z'
  }), {
    revisionLabel: '#1fe3af2f',
    dateLabel: "@ 5 May '26",
    href: 'https://github.com/iK4oS/pepsi-bot/commit/1fe3af2f0123456789abcdef0123456789abcdef',
    isoDate: '2026-05-05T14:03:00Z'
  });
});

test('rejects malformed GitHub revision data', () => {
  assert.equal(buildInfoPayload({ sha: 'not-a-sha', date: '2026-05-05T14:03:00Z' }), null);
});
