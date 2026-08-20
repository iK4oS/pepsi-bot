import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALIZATION_INCOMPLETE, channelCursor, discordRequest, extractPost, materializePost, mergePosts, reconcilePosts, resolveMaterializedPost, scanCursor, shouldWriteSync } from '../scripts/sync.mjs';

const context = {
  guildId: '731881028573986874',
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
    channelId: '1156474286303891486',
    url: 'https://discord.com/channels/731881028573986874/1156474286303891486/200',
    images: [{ sourceUrl: 'https://cdn.discordapp.com/a.jpg', fallbackUrl: 'https://cdn.discordapp.com/a.jpg', filename: '200-a1.jpg', width: 1200, height: 1600 }],
    videos: []
  });
});

test('extracts browser-playable video attachments alongside images', () => {
  const message = {
    id: '206', channel_id: '1096355083823890452', author: { id: context.targetUserId },
    timestamp: '2026-08-18T12:00:00Z', content: 'Moving Pepsi', embeds: [],
    attachments: [
      { id: 'v1', filename: 'clip.mp4', content_type: 'video/mp4', url: 'https://cdn/clip.mp4', size: 1234567, width: 1080, height: 1920 },
      { id: 'i1', filename: 'still.webp', content_type: 'image/webp', url: 'https://cdn/still.webp', width: 800, height: 600 }
    ]
  };
  const post = extractPost(message, { ...context, channelId: message.channel_id });
  assert.equal(post.url, 'https://discord.com/channels/731881028573986874/1096355083823890452/206');
  assert.deepEqual(post.videos, [{ sourceUrl: 'https://cdn/clip.mp4', fallbackUrl: 'https://cdn/clip.mp4', filename: '206-v1.mp4', contentType: 'video/mp4', size: 1234567, width: 1080, height: 1920 }]);
  assert.equal(post.images.length, 1);
});

test('includes video-only forwarded snapshots with fallback copy', () => {
  const message = {
    id: '207', channel_id: '1096355083823890452', author: { id: 'forwarder' }, timestamp: '2026-08-18T13:00:00Z',
    content: '', attachments: [], embeds: [], message_snapshots: [{ message: { content: '', embeds: [], attachments: [
      { id: 'v2', filename: 'forward.webm', content_type: 'video/webm', url: 'https://cdn/forward.webm', size: 5000 }
    ] } }]
  };
  const post = extractPost(message, { ...context, channelId: message.channel_id });
  assert.equal(post.text, 'Forwarded Post');
  assert.equal(post.videos.length, 1);
});

test('extracts forwarded snapshots regardless of the forwarding wrapper author', () => {
  const message = {
    id: '201',
    channel_id: context.channelId,
    author: { id: 'different-wrapper-author' },
    content: '',
    timestamp: '2026-08-18T09:00:00.000Z',
    attachments: [],
    embeds: [],
    message_reference: { type: 1, guild_id: '828022955875368981', channel_id: '1131897266832162857', message_id: '199' },
    message_snapshots: [{ message: {
      content: 'Forwarded caption',
      attachments: [],
      embeds: [{ type: 'image', image: { url: 'https://media.discordapp.net/forwarded.png', width: 900, height: 600 } }]
    }}]
  };

  assert.equal(extractPost(message, context).text, 'Forwarded caption');
  assert.equal(extractPost(message, context).images[0].sourceUrl, 'https://media.discordapp.net/forwarded.png');
  assert.equal(extractPost(message, context).url, 'https://discord.com/channels/731881028573986874/1131897266832162857/199');
});

test('forward links fall back to the wrapper when Discord omits the source reference', () => {
  const message = {
    id: '209', channel_id: context.channelId, author: { id: 'forwarder' }, timestamp: '2026-08-18T09:00:00Z',
    content: '', attachments: [], embeds: [], message_snapshots: [{ message: {
      content: 'Forwarded without a reference', embeds: [],
      attachments: [{ id: 'a', filename: 'x.jpg', content_type: 'image/jpeg', url: 'https://cdn/x.jpg' }]
    }}]
  };
  assert.equal(extractPost(message, context).url, `https://discord.com/channels/${context.guildId}/${context.channelId}/209`);
});

test('includes image-only forwards with a fallback title', () => {
  const message = {
    id: '1517532821604925672', channel_id: context.channelId,
    author: { id: context.targetUserId }, timestamp: '2026-06-19T14:13:39.067Z',
    content: '', attachments: [], embeds: [], message_reference: { type: 1 },
    message_snapshots: [{ message: {
      content: '', embeds: [],
      attachments: [{ id: '1517532821353136158', filename: 'image.png', content_type: 'image/png', url: 'https://cdn.discordapp.com/image.png', width: 807, height: 1000 }]
    }}]
  };
  const post = extractPost(message, context);
  assert.equal(post.text, 'Forwarded Post');
  assert.equal(post.images.length, 1);
});

test('includes textless visual posts and rejects text-only or other-author posts', () => {
  const base = { id: '202', channel_id: context.channelId, author: { id: context.targetUserId }, timestamp: '2026-08-18T10:00:00Z', content: 'text', attachments: [], embeds: [] };
  assert.equal(extractPost(base, context), null);
  assert.equal(extractPost({ ...base, content: '', attachments: [{ id: 'a', filename: 'x.png', content_type: 'image/png', url: 'https://cdn/x.png' }] }, context).text, 'Untitled Post');
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

test('skips externally hosted GIF embeds but keeps uploaded GIF attachments', () => {
  const base = {
    id: '210', channel_id: context.channelId, author: { id: context.targetUserId },
    timestamp: '2026-08-18T11:00:00Z', content: '',
    attachments: [{ id: 'upload', filename: 'cat.gif', content_type: 'image/gif', url: 'https://cdn.discordapp.com/cat.gif', width: 320, height: 240 }],
    embeds: [
      { type: 'gifv', url: 'https://tenor.com/view/cat-123', thumbnail: { url: 'https://media.tenor.com/cat.webp', width: 498, height: 280 } },
      { type: 'image', image: { url: 'https://media.giphy.com/cat.gif', width: 400, height: 300 } }
    ]
  };
  const post = extractPost(base, context);
  assert.equal(post.text, 'Untitled Post');
  assert.deepEqual(post.images.map(image => image.filename), ['210-upload.gif']);
  assert.equal(extractPost({ ...base, attachments: [], embeds: [base.embeds[0]] }, context), null);
});

test('uses fallback copy for URL-only captions and removes media URLs from real captions', () => {
  const base = {
    id: '205', channel_id: context.channelId, author: { id: context.targetUserId },
    timestamp: '2026-08-18T11:00:00Z', attachments: [],
    embeds: [{ image: { url: 'https://cdn/embed.jpg' } }]
  };
  assert.equal(extractPost({ ...base, content: 'https://cdn.discordapp.com/photo.jpg' }, context).text, 'Untitled Post');
  assert.equal(extractPost({ ...base, content: 'Dinner tonight\nhttps://cdn.discordapp.com/photo.jpg' }, context).text, 'Dinner tonight');
});

test('full sync ignores the saved incremental cursor', () => {
  assert.equal(scanCursor('123', false), '123');
  assert.equal(scanCursor('123', true), null);
});

test('per-channel cursor migrates the original legacy cursor without skipping a new channel', () => {
  const cursors = {};
  assert.equal(channelCursor(cursors, context.channelId, context.channelId, '123', false), '123');
  assert.equal(channelCursor(cursors, '1096355083823890452', context.channelId, '123', false), null);
  assert.equal(channelCursor({ '1096355083823890452': '456' }, '1096355083823890452', context.channelId, '123', false), '456');
  assert.equal(channelCursor(cursors, context.channelId, context.channelId, '123', true), null);
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
  const partial = await materializePost(post, downloader, silent);
  assert.deepEqual(partial.images, [{ src: 'media/good.jpg' }]);
  assert.equal(partial[MATERIALIZATION_INCOMPLETE], true);
  const existing = { id: '204', text: 'caption', images: [{ src: 'media/bad.jpg' }, { src: 'media/good.jpg' }], videos: [] };
  assert.equal(resolveMaterializedPost(existing, partial), existing);
  assert.equal(resolveMaterializedPost(null, partial), partial);
  assert.equal(await materializePost({ ...post, images: [{ filename: 'bad.jpg' }] }, downloader, silent), null);
});

test('archives videos and keeps a post when video is its only available media', async () => {
  const post = { id: '208', text: 'video', images: [], videos: [{ filename: 'clip.mp4', contentType: 'video/mp4', sourceUrl: 'https://cdn.discordapp.com/clip.mp4', fallbackUrl: 'https://cdn.discordapp.com/clip.mp4' }] };
  const downloader = async media => ({ src: `media/${media.filename}`, contentType: media.contentType });
  assert.deepEqual(await materializePost(post, downloader), {
    ...post,
    videos: [{ src: 'media/clip.mp4', fallbackUrl: 'https://cdn.discordapp.com/clip.mp4', contentType: 'video/mp4' }]
  });
});

test('does not expose a non-Discord embed source as an attachment fallback', async () => {
  const post = { id: '210', text: 'embed', images: [{ filename: 'embed.jpg', sourceUrl: 'https://media.graphassets.com/embed.jpg' }], videos: [] };
  const downloader = async media => ({ src: `media/${media.filename}` });
  assert.deepEqual((await materializePost(post, downloader)).images, [{ src: 'media/embed.jpg' }]);
});

test('mergePosts deduplicates by id and sorts newest first', () => {
  const old = [{ id: '1', date: '2026-01-01T00:00:00Z' }, { id: '2', date: '2026-02-01T00:00:00Z' }];
  const fresh = [{ id: '1', date: '2026-03-01T00:00:00Z' }, { id: '3', date: '2026-01-15T00:00:00Z' }];
  assert.deepEqual(mergePosts(old, fresh).map(post => post.id), ['1', '2', '3']);
});

test('full sync removes ineligible posts but retains eligible posts after transient archival failure', () => {
  const existing = [
    { id: 'stale-a', channelId: 'a', date: '2026-01-01T00:00:00Z' },
    { id: 'keep-failed', channelId: 'b', date: '2026-01-02T00:00:00Z' },
    { id: 'keep-c', channelId: 'c', date: '2026-01-03T00:00:00Z' }
  ];
  const fresh = [{ id: 'fresh-a', channelId: 'a', date: '2026-01-04T00:00:00Z' }];
  const eligible = new Set(['fresh-a', 'keep-failed']);
  assert.deepEqual(reconcilePosts(existing, fresh, ['a', 'b'], true, eligible).map(post => post.id), ['fresh-a', 'keep-c', 'keep-failed']);
  assert.deepEqual(reconcilePosts(existing, fresh, ['a', 'b'], false, eligible).map(post => post.id), ['fresh-a', 'keep-c', 'keep-failed', 'stale-a']);
});

test('full sync writes reconciled state even when all scanned channels are empty', () => {
  assert.equal(shouldWriteSync(0, false), false);
  assert.equal(shouldWriteSync(0, true), true);
  assert.equal(shouldWriteSync(1, false), true);
});
