import test from 'node:test';
import assert from 'node:assert/strict';
import { discordRequest, extractPost, materializePost, mergePosts } from '../scripts/sync.mjs';

const context = {
  guildId: '828022955875368981',
  channelId: '1156474286303891486',
  targetUserId: '673196202870833164'
};

test('extracts text, date, link, and image attachments from a target-user message', () => {
  const message = {
    id: '200',
    channel_id: context.channelId,
    author: { id: context.targetUserId },
    content: 'A quiet morning',
    timestamp: '2026-08-18T08:00:00.000Z',
    attachments: [{ id: 'a1', filename: 'photo.jpg', content_type: 'image/jpeg', url: 'https://cdn.discordapp.com/a.jpg', width: 1200, height: 1600 }],
    embeds: []
  };

  assert.deepEqual(extractPost(message, context), {
    id: '200',
    text: 'A quiet morning',
    date: '2026-08-18T08:00:00.000Z',
    url: 'https://discord.com/channels/828022955875368981/1156474286303891486/200',
    images: [{ sourceUrl: 'https://cdn.discordapp.com/a.jpg', filename: '200-a1.jpg', width: 1200, height: 1600 }]
  });
});

test('extracts forwarded snapshot text and images while filtering by forwarding user', () => {
  const message = {
    id: '201',
    channel_id: context.channelId,
    author: { id: context.targetUserId },
    content: '',
    timestamp: '2026-08-18T09:00:00.000Z',
    attachments: [],
    embeds: [],
    message_reference: { type: 1 },
    message_snapshots: [{ message: {
      content: 'Forwarded caption',
      attachments: [],
      embeds: [{ type: 'image', image: { url: 'https://media.discordapp.net/forwarded.png', width: 900, height: 600 } }]
    }}]
  };

  assert.equal(extractPost(message, context).text, 'Forwarded caption');
  assert.equal(extractPost(message, context).images[0].sourceUrl, 'https://media.discordapp.net/forwarded.png');
});

test('requires both text and at least one image and rejects other authors', () => {
  const base = { id: '202', channel_id: context.channelId, author: { id: context.targetUserId }, timestamp: '2026-08-18T10:00:00Z', content: 'text', attachments: [], embeds: [] };
  assert.equal(extractPost(base, context), null);
  assert.equal(extractPost({ ...base, content: '', attachments: [{ id: 'a', filename: 'x.png', content_type: 'image/png', url: 'https://cdn/x.png' }] }, context), null);
  assert.equal(extractPost({ ...base, author: { id: 'someone-else' }, attachments: [{ id: 'a', filename: 'x.png', content_type: 'image/png', url: 'https://cdn/x.png' }] }, context), null);
});

test('uses embed copy when the message body is empty', () => {
  const message = {
    id: '203', channel_id: context.channelId, author: { id: context.targetUserId },
    timestamp: '2026-08-18T11:00:00Z', content: '', attachments: [],
    embeds: [{ title: 'A title', description: 'Embed caption', image: { url: 'https://cdn/embed.jpg' } }]
  };
  assert.equal(extractPost(message, context).text, 'A title\nEmbed caption');
});

test('rejects URL-only captions and removes media URLs from real captions', () => {
  const base = {
    id: '205', channel_id: context.channelId, author: { id: context.targetUserId },
    timestamp: '2026-08-18T11:00:00Z', attachments: [],
    embeds: [{ image: { url: 'https://cdn/embed.jpg' } }]
  };
  assert.equal(extractPost({ ...base, content: 'https://cdn.discordapp.com/photo.jpg' }, context), null);
  assert.equal(extractPost({ ...base, content: 'Dinner tonight\nhttps://cdn.discordapp.com/photo.jpg' }, context).text, 'Dinner tonight');
});

test('retries Discord rate limits using the server retry delay', async () => {
  let calls = 0;
  const waits = [];
  const fetcher = async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 429, json: async () => ({ retry_after: 0.3 }) };
    return { ok: true, json: async () => ([{ id: '1' }]) };
  };
  const result = await discordRequest('https://discord.test', 'token', fetcher, async ms => waits.push(ms));
  assert.deepEqual(result, [{ id: '1' }]);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [400]);
});

test('skips unavailable images and drops a post only when none remain', async () => {
  const post = { id: '204', text: 'caption', images: [{ filename: 'bad.jpg' }, { filename: 'good.jpg' }] };
  const downloader = async image => {
    if (image.filename === 'bad.jpg') throw new Error('404');
    return { src: 'media/good.jpg' };
  };
  const silent = () => {};
  assert.deepEqual((await materializePost(post, downloader, silent)).images, [{ src: 'media/good.jpg' }]);
  assert.equal(await materializePost({ ...post, images: [{ filename: 'bad.jpg' }] }, downloader, silent), null);
});

test('mergePosts deduplicates by id and sorts newest first', () => {
  const old = [{ id: '1', date: '2026-01-01T00:00:00Z' }, { id: '2', date: '2026-02-01T00:00:00Z' }];
  const fresh = [{ id: '1', date: '2026-03-01T00:00:00Z' }, { id: '3', date: '2026-01-15T00:00:00Z' }];
  assert.deepEqual(mergePosts(old, fresh).map(post => post.id), ['1', '2', '3']);
});
