import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildInfoDocument } from '../scripts/build-info.mjs';

test('serializes deployment-specific revision metadata', () => {
  assert.equal(createBuildInfoDocument({
    sha: '1fe3af2f0123456789abcdef0123456789abcdef',
    date: '2026-05-05T14:03:00+00:00'
  }), '{\n  "sha": "1fe3af2f0123456789abcdef0123456789abcdef",\n  "date": "2026-05-05T14:03:00.000Z"\n}\n');
});

test('rejects invalid deployment revisions', () => {
  assert.throws(() => createBuildInfoDocument({ sha: 'main', date: '2026-05-05' }), /revision/i);
});
