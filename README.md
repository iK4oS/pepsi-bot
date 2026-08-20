# Pepsi Cat / Archive

A fast, searchable image-and-video archive for **Cat with Pepsi Addiction**, sourced from Discord and served at [pepsicat.photos](https://pepsicat.photos/).

The site preserves original media locally while using lightweight previews for the collage. It is a static frontend deployed through Cloudflare Workers Builds, with Discord synchronization handled by GitHub Actions.

## What the site includes

- `/` and `/archive` — the complete archive
- `/food` — posts from the configured Food channel
- `/pets` — posts from the configured Pets channel
- Search by Discord message ID or caption
- Dark and light themes
- Responsive multi-column image/video collage
- Full-resolution image lightbox
- Native full-resolution link interactions for right-click, middle-click, and modified clicks
- Native video controls with deferred loading and generated poster frames
- A deployment footer showing the exact Git commit and commit date running on Cloudflare

## Content rules

A direct Discord message is included when:

- its author matches `DISCORD_TARGET_USER_ID`; and
- it contains at least one supported image or video.

Text is optional. Direct visual posts without meaningful text use **“Untitled Post”** as their caption. URL-only captions are cleaned and receive the same fallback. Textless forwarded snapshots use **“Forwarded Post”**.

Forwarded snapshots are read from the configured archive channels even when Discord exposes a different wrapper author. When Discord provides a source reference, its channel/message pair is preserved under the configured archive guild. The configured guild remains authoritative because forwarded metadata can carry stale or unrelated guild IDs. Without a source reference, the archive links honestly to the forwarding wrapper.

Ingestion accepts common image formats plus MP4, WebM, OGV, MOV, and M4V video attachments. Uploaded GIF attachments are retained, while externally hosted GIF/GIFV embeds from services such as Tenor are excluded. Actual native playback depends on the visitor's browser and the codecs inside each file. Posts containing only text are not archived.

## Media storage and performance

Original attachments are downloaded into `public/media/`; the browser does not depend on expiring Discord CDN URLs for normal playback or viewing. Discord attachment URLs remain only as last-resort fallbacks.

During synchronization, FFmpeg generates bounded 720 px WebP previews in `public/media/thumbnails/`:

1. The collage loads the generated preview.
2. If the preview fails, it falls back to the local original.
3. If the original is unavailable, it can fall back to the Discord attachment URL.

Thumbnail writes use a temporary file plus atomic rename. A thumbnail failure never discards an otherwise valid original.

Images remain linked to their full-resolution originals. A normal click opens the lightbox; native context-menu, middle-click, and Ctrl/Cmd/Shift/Alt-click behavior targets the original file. Videos use `preload="none"` and load the original only when playback begins.

## Automation

`.github/workflows/sync.yml` runs every five minutes and on relevant pushes.

- Scheduled runs use per-channel cursors for incremental ingestion.
- Relevant pushes request a full backlog scan so normalization changes backfill old posts and remove posts that are no longer eligible.
- Media downloads and thumbnail generation happen independently per attachment.
- `public/data/posts.json` is deduplicated by Discord message ID and sorted newest first.
- New content is committed by `github-actions[bot]`, which triggers a fresh static deployment.

GitHub schedules are best-effort and may occasionally start later than the five-minute cron interval.

## Cloudflare deployment

The repository is connected to the Cloudflare Worker named `pepsi-bot`. `wrangler.jsonc` configures `public/` as the static asset directory and runs:

```bash
npm run build
```

The build step reads Cloudflare Workers Builds' exact `WORKERS_CI_COMMIT_SHA`, resolves that commit's timestamp from Git, and writes an ignored `public/build-info.json` into the deployment artifact. The footer therefore reports the deployed artifact revision rather than the moving tip of `main`.

A local deployment dry-run can be performed with:

```bash
npx wrangler deploy --dry-run
```

## Discord configuration

Current archive identifiers:

- Guild: `731881028573986874`
- Food/source channel: `1156474286303891486`
- Pets/source channel: `1096355083823890452`
- Direct-post target user: `673196202870833164`

Set up a dedicated Discord bot with only **View Channel** and **Read Message History** access to the archive channels. Enable **Message Content Intent** so captions and embed text are available. Store its token only as the GitHub Actions secret `DISCORD_BOT_TOKEN`.

To run a full synchronization locally:

```bash
export DISCORD_BOT_TOKEN='...'
export DISCORD_GUILD_ID='731881028573986874'
export DISCORD_CHANNEL_ID='1156474286303891486'
export DISCORD_CHANNEL_IDS='1156474286303891486,1096355083823890452'
export DISCORD_TARGET_USER_ID='673196202870833164'
FULL_SYNC=true npm run sync
```

FFmpeg must be available for preview generation. The GitHub Actions workflow installs it automatically when needed.

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm test
npm run check
npm run build
python3 -m http.server 4173 --directory public
```

Open <http://localhost:4173/>. `npm run build` creates an ignored `public/build-info.json` for the current local Git revision.

## Repository layout

```text
public/                 Static site, route shells, data, originals, and previews
scripts/sync.mjs        Discord ingestion and archive materialization
scripts/thumbnails.mjs  FFmpeg preview generation
scripts/build-info.mjs  Exact deployment revision metadata generation
test/                   Node test suite
wrangler.jsonc          Cloudflare Workers static-assets configuration
```

## Security model

- The Discord token exists only in GitHub Actions or an explicit local environment.
- No bot token, Cloudflare credential, or GitHub credential is shipped to browser code.
- The deployed Content Security Policy restricts scripts and media sources.
- Archived media is intentionally public at `pepsicat.photos`; keep the repository private if source-level browsing should be restricted.
