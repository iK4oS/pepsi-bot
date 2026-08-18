# Pepsi Cat / Archive

A static, responsive photo collage for **Cat with Pepsi Addiction**, designed for Cloudflare Pages. A GitHub Actions job reads one Discord channel every five minutes, filters messages posted or forwarded by one user, requires both text and image content, archives the images, and updates the site.

## Security model

- The Discord bot token is used only by GitHub Actions and never reaches browser code.
- Store the token as the repository secret `DISCORD_BOT_TOKEN`; never commit or paste it into public chat.
- Use a dedicated bot with only **View Channel** and **Read Message History** access to the source channel.
- Keep the GitHub repository private if the archived photos should not be directly browsable in source control.
- Cloudflare Pages serves only the `public/` output directory.

## Discord setup

1. Create or select a dedicated Discord application bot.
2. Enable **Message Content Intent** in the Developer Portal so text is available.
3. Add the bot to the server and grant it **View Channel** and **Read Message History** on channel `1156474286303891486` only.
4. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Name it `DISCORD_BOT_TOKEN`.
5. Run **Actions → Sync Discord collage → Run workflow** once. The first run walks the full channel backlog; later runs fetch only newer messages.

Discord snapshots deliberately omit the original author's identity. Therefore forwarded entries are filtered by the user who forwarded them into the configured channel (`673196202870833164`), while their snapshot text and images are displayed.

## Cloudflare Pages

Connect the GitHub repository in **Workers & Pages → Create → Pages → Connect to Git**:

- Production branch: `main`
- Framework preset: `None`
- Build command: leave empty
- Build output directory: `public`

Every content commit triggers a Pages deployment. Scheduled GitHub Actions use a five-minute cron, but GitHub may occasionally delay scheduled jobs under load.

## Local verification

```bash
npm test
npm run check
python -m http.server 4173 --directory public
```

Open <http://localhost:4173>. To run a real sync locally, export `DISCORD_BOT_TOKEN`, then:

```bash
export DISCORD_GUILD_ID=828022955875368981
export DISCORD_CHANNEL_ID=1156474286303891486
export DISCORD_TARGET_USER_ID=673196202870833164
npm run sync
```

## Content rules

A collage entry is included only when:

- the wrapper message author matches the configured user;
- it has non-empty message text or embed title/description; and
- it has at least one image attachment or embed image.

Images are downloaded into `public/media/` so expiring Discord CDN signatures cannot break old posts. Entries are deduplicated by Discord message ID and displayed newest first.
