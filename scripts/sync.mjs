import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'public/data/posts.json');
const MEDIA_DIR = path.join(ROOT, 'public/media');
const API = 'https://discord.com/api/v10';

function imageExtension(filename = '', contentType = '', url = '') {
  const fromName = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (/^\.(avif|gif|jpe?g|png|webp)$/.test(fromName)) return fromName === '.jpeg' ? '.jpg' : fromName;
  const types = { 'image/avif': '.avif', 'image/gif': '.gif', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  if (types[contentType]) return types[contentType];
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return /^\.(avif|gif|jpe?g|png|webp)$/.test(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : '.jpg';
  } catch { return '.jpg'; }
}

function videoExtension(filename = '', contentType = '', url = '') {
  const fromName = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (/^\.(m4v|mov|mp4|ogv|webm)$/.test(fromName)) return fromName;
  const types = { 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/ogg': '.ogv', 'video/webm': '.webm' };
  if (types[contentType]) return types[contentType];
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return /^\.(m4v|mov|mp4|ogv|webm)$/.test(ext) ? ext : '.mp4';
  } catch { return '.mp4'; }
}

function collectImages(message, messageId) {
  const images = [];
  for (const attachment of message.attachments ?? []) {
    const isImage = attachment.content_type?.startsWith('image/') || /\.(avif|gif|jpe?g|png|webp)$/i.test(attachment.filename ?? '');
    if (!isImage || !attachment.url) continue;
    const ext = imageExtension(attachment.filename, attachment.content_type, attachment.url);
    images.push({ sourceUrl: attachment.url, filename: `${messageId}-${attachment.id}${ext}`, width: attachment.width, height: attachment.height });
  }
  for (const [index, embed] of (message.embeds ?? []).entries()) {
    for (const candidate of [embed.image, embed.thumbnail]) {
      if (!candidate?.url || images.some(image => image.sourceUrl === candidate.url)) continue;
      const ext = imageExtension('', '', candidate.url);
      images.push({ sourceUrl: candidate.url, filename: `${messageId}-embed-${index}-${images.length}${ext}`, width: candidate.width, height: candidate.height });
    }
  }
  return images;
}

function collectVideos(message, messageId) {
  const videos = [];
  for (const attachment of message.attachments ?? []) {
    const isVideo = attachment.content_type?.startsWith('video/') || /\.(m4v|mov|mp4|ogv|webm)$/i.test(attachment.filename ?? '');
    if (!isVideo || !attachment.url) continue;
    const ext = videoExtension(attachment.filename, attachment.content_type, attachment.url);
    videos.push({
      sourceUrl: attachment.url,
      filename: `${messageId}-${attachment.id}${ext}`,
      contentType: attachment.content_type || (ext === '.webm' ? 'video/webm' : 'video/mp4'),
      size: attachment.size,
      width: attachment.width,
      height: attachment.height
    });
  }
  return videos;
}

function cleanCaption(value = '') {
  return value.replace(/https?:\/\/\S+/gi, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function extractPost(wrapper, { guildId, channelId, targetUserId }) {
  const isForward = Boolean(wrapper.message_snapshots?.length);
  if (wrapper.author?.id !== targetUserId && !isForward) return null;
  const snapshot = isForward ? wrapper.message_snapshots[0].message : null;
  const source = snapshot ?? wrapper;
  const embedText = (source.embeds ?? [])
    .flatMap(embed => [embed.title, embed.description])
    .filter(Boolean)
    .join('\n');
  let text = cleanCaption((source.content ?? '').trim() || embedText.trim());
  const images = collectImages(source, wrapper.id);
  const videos = collectVideos(source, wrapper.id);
  if (!text && isForward && (images.length || videos.length)) text = 'Forwarded post';
  if (!text || (images.length === 0 && videos.length === 0)) return null;
  return {
    id: wrapper.id,
    text,
    date: wrapper.timestamp,
    channelId,
    url: `https://discord.com/channels/${guildId}/${channelId}/${wrapper.id}`,
    images,
    videos
  };
}

export function mergePosts(existing, fresh) {
  const byId = new Map(existing.map(post => [post.id, post]));
  for (const post of fresh) byId.set(post.id, post);
  return [...byId.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function scanCursor(savedCursor, fullSync = false) {
  return fullSync ? null : savedCursor;
}

export function channelCursor(savedCursors, channelId, legacyChannelId, legacyCursor, fullSync = false) {
  if (fullSync) return null;
  return savedCursors?.[channelId] ?? (channelId === legacyChannelId ? legacyCursor : null);
}

export async function discordRequest(url, token, fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempt = 1) {
  const response = await fetcher(url, {
    headers: { Authorization: `Bot ${token}`, 'User-Agent': 'DiscordPhotoCollage/1.0' }
  });
  if (response.status === 429 && attempt < 6) {
    const rateLimit = await response.json();
    await sleep(Math.ceil((rateLimit.retry_after ?? 1) * 1000) + 100);
    return discordRequest(url, token, fetcher, sleep, attempt + 1);
  }
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${await response.text()}`);
  return response.json();
}

async function discordPage(token, channelId, query) {
  return discordRequest(`${API}/channels/${channelId}/messages?limit=100&${query}`, token);
}

async function fetchMessages(token, channelId, lastScannedId) {
  const messages = [];
  if (lastScannedId) {
    let after = lastScannedId;
    while (true) {
      const page = await discordPage(token, channelId, `after=${after}`);
      if (!page.length) break;
      messages.push(...page);
      const next = page.reduce((max, item) => BigInt(item.id) > BigInt(max) ? item.id : max, after);
      if (next === after || page.length < 100) break;
      after = next;
    }
  } else {
    let before = '';
    while (true) {
      const page = await discordPage(token, channelId, before ? `before=${before}` : '');
      if (!page.length) break;
      messages.push(...page);
      before = page.at(-1).id;
      if (page.length < 100) break;
    }
  }
  return messages;
}

async function downloadMedia(media) {
  await mkdir(MEDIA_DIR, { recursive: true });
  const destination = path.join(MEDIA_DIR, media.filename);
  try {
    await readFile(destination);
  } catch {
    const response = await fetch(media.sourceUrl);
    if (!response.ok) throw new Error(`Media download ${response.status}: ${media.sourceUrl}`);
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  }
  return {
    src: `media/${media.filename}`,
    width: media.width,
    height: media.height,
    ...(media.contentType ? { contentType: media.contentType } : {})
  };
}

export async function materializePost(post, downloader = downloadMedia, warn = console.warn) {
  const images = [];
  for (const image of post.images) {
    try {
      images.push(await downloader(image));
    } catch (error) {
      warn(`Skipping unavailable image ${image.filename}: ${error.message}`);
    }
  }
  const videos = [];
  for (const video of post.videos ?? []) {
    try {
      videos.push(await downloader(video));
    } catch (error) {
      warn(`Skipping unavailable video ${video.filename}: ${error.message}`);
    }
  }
  return images.length || videos.length ? { ...post, images, videos } : null;
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const configuredChannels = process.env.DISCORD_CHANNEL_IDS || process.env.DISCORD_CHANNEL_ID;
  const channelIds = [...new Set((configuredChannels ?? '').split(',').map(value => value.trim()).filter(Boolean))];
  const legacyChannelId = process.env.DISCORD_CHANNEL_ID || channelIds[0];
  const targetUserId = process.env.DISCORD_TARGET_USER_ID;
  if (!token || !guildId || channelIds.length === 0 || !targetUserId) throw new Error('Missing required Discord environment variables');

  let state = { updatedAt: null, lastScannedId: null, lastScannedIds: {}, posts: [] };
  try { state = { ...state, ...JSON.parse(await readFile(DATA_PATH, 'utf8')) }; } catch {}

  const fullSync = /^(1|true|yes)$/i.test(process.env.FULL_SYNC ?? '');
  const lastScannedIds = { ...(state.lastScannedIds ?? {}) };
  const materialized = [];
  let totalMessages = 0;

  for (const channelId of channelIds) {
    const cursor = channelCursor(lastScannedIds, channelId, legacyChannelId, state.lastScannedId, fullSync);
    const messages = await fetchMessages(token, channelId, cursor);
    totalMessages += messages.length;
    if (messages.length === 0) {
      console.log(`Channel ${channelId}: no messages newer than ${cursor ?? 'the beginning'}.`);
      continue;
    }

    const context = { guildId, channelId, targetUserId };
    const extracted = messages.map(message => extractPost(message, context)).filter(Boolean);
    const forwarded = messages.filter(message => message.message_snapshots?.length);
    const eligibleForwards = forwarded.map(message => extractPost(message, context)).filter(Boolean);
    const extractedVideos = extracted.reduce((count, post) => count + post.videos.length, 0);
    console.log(`Channel ${channelId}: ${messages.length} messages; ${forwarded.length} forwards (${eligibleForwards.length} eligible); ${extractedVideos} videos.`);

    for (const post of extracted) {
      const archived = await materializePost(post);
      if (archived) materialized.push(archived);
    }

    lastScannedIds[channelId] = messages.reduce(
      (max, message) => !max || BigInt(message.id) > BigInt(max) ? message.id : max,
      lastScannedIds[channelId] ?? (channelId === legacyChannelId ? state.lastScannedId : null)
    );
  }

  if (totalMessages === 0) {
    console.log('No new messages in any configured channel; nothing to update.');
    return;
  }

  const output = {
    updatedAt: new Date().toISOString(),
    lastScannedIds,
    posts: mergePosts(state.posts, materialized)
  };
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Scanned ${totalMessages} messages across ${channelIds.length} channels; added ${materialized.length}; total ${output.posts.length}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
