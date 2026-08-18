const token = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;
const messageId = process.env.DISCORD_MESSAGE_ID;
if (!token || !channelId || !messageId) throw new Error('Missing diagnostic environment variables');

const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
  headers: { Authorization: `Bot ${token}`, 'User-Agent': 'DiscordPhotoCollageDiagnostic/1.0' }
});
if (!response.ok) throw new Error(`Discord API ${response.status}: ${await response.text()}`);
const message = await response.json();

function sanitize(value, key = '', depth = 0) {
  if (depth > 8) return '<max-depth>';
  if (Array.isArray(value)) return value.map(item => sanitize(item, key, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitize(child, childKey, depth + 1)]));
  }
  if (typeof value === 'string') {
    if (/^(id|.*_id)$/.test(key) || ['type', 'content_type', 'filename'].includes(key)) return value;
    if (key === 'url' || key === 'proxy_url') {
      try { const url = new URL(value); return `${url.hostname}${url.pathname}`; } catch {}
    }
    return `<string length=${value.length}>`;
  }
  return value;
}

console.log(JSON.stringify(sanitize(message), null, 2));
