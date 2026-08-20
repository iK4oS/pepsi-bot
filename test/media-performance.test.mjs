import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  imageMediaPayload,
  upgradeImageToFullResolution,
  videoMediaPayload
} from '../public/media-performance.js';
import { ensureThumbnail, thumbnailMetadata, thumbnailRelativePath } from '../scripts/thumbnails.mjs';

test('gallery images use a thumbnail preview while retaining the full-resolution source', () => {
  assert.deepEqual(imageMediaPayload({
    src: 'media/cat.jpg',
    thumbnailSrc: 'media/thumbnails/cat.webp',
    fallbackUrl: 'https://cdn.discordapp.com/cat.jpg'
  }), {
    previewSrc: 'media/thumbnails/cat.webp',
    fullSrc: 'media/cat.jpg',
    fallbackUrl: 'https://cdn.discordapp.com/cat.jpg'
  });
});

test('legacy gallery images without thumbnails continue to use their full source', () => {
  assert.deepEqual(imageMediaPayload({ src: 'media/cat.jpg' }), {
    previewSrc: 'media/cat.jpg',
    fullSrc: 'media/cat.jpg'
  });
});

test('right-click upgrades an image element to its full-resolution URL', () => {
  const image = {
    src: 'https://pepsicat.photos/media/thumbnails/cat.webp',
    dataset: { fullSrc: 'https://pepsicat.photos/media/cat.jpg' }
  };
  assert.equal(upgradeImageToFullResolution(image), true);
  assert.equal(image.src, 'https://pepsicat.photos/media/cat.jpg');
  assert.equal(upgradeImageToFullResolution(image), false);
});

test('videos expose a lightweight poster and defer loading the full video', () => {
  assert.deepEqual(videoMediaPayload({
    src: 'media/cat.mp4',
    thumbnailSrc: 'media/thumbnails/cat.webp',
    fallbackUrl: 'https://cdn.discordapp.com/cat.mp4'
  }), {
    src: 'media/cat.mp4',
    poster: 'media/thumbnails/cat.webp',
    preload: 'none',
    fallbackUrl: 'https://cdn.discordapp.com/cat.mp4'
  });
});

test('thumbnail paths are stable webp assets in a dedicated directory', () => {
  assert.equal(
    thumbnailRelativePath('media/153-cat.final.MP4'),
    'media/thumbnails/153-cat.final.webp'
  );
});

test('thumbnail generation creates a bounded webp preview and seeks video input', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pepsi-thumbnail-'));
  const output = path.join(directory, 'nested', 'cat.webp');
  let invocation;
  const run = async (command, args) => {
    invocation = { command, args };
    await writeFile(args.at(-1), 'valid webp');
  };

  assert.equal(await ensureThumbnail('/media/cat.mp4', output, 'video', run), true);
  assert.equal(invocation.command, 'ffmpeg');
  assert.deepEqual(invocation.args.slice(0, 7), [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.1', '-i'
  ]);
  assert.equal(invocation.args.includes('scale=720:720:force_original_aspect_ratio=decrease'), true);
  assert.match(invocation.args.at(-1), /\.tmp\.webp$/);
  assert.notEqual(invocation.args.at(-1), output);
  assert.equal(await readFile(output, 'utf8'), 'valid webp');
});

test('thumbnail generation leaves an existing preview untouched', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pepsi-thumbnail-existing-'));
  const output = path.join(directory, 'cat.webp');
  await writeFile(output, 'already generated');
  let called = false;

  assert.equal(await ensureThumbnail('/media/cat.jpg', output, 'image', async () => { called = true; }), false);
  assert.equal(called, false);
});

test('thumbnail generation replaces a zero-byte partial preview atomically', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pepsi-thumbnail-partial-'));
  const output = path.join(directory, 'cat.webp');
  await writeFile(output, '');
  let generatedPath;

  assert.equal(await ensureThumbnail('/media/cat.jpg', output, 'image', async (_command, args) => {
    generatedPath = args.at(-1);
    await writeFile(generatedPath, 'replacement');
  }), true);
  assert.notEqual(generatedPath, output);
  assert.equal(await readFile(output, 'utf8'), 'replacement');
});

test('a thumbnail encoder failure preserves the full-resolution media record', async () => {
  const warnings = [];
  const metadata = await thumbnailMetadata(
    '/public/media/cat.jpg',
    '/public',
    'media/cat.jpg',
    'image',
    async () => { throw new Error('unsupported input'); },
    warning => warnings.push(warning)
  );

  assert.deepEqual(metadata, {});
  assert.deepEqual(warnings, ['Could not generate thumbnail for media/cat.jpg: unsupported input']);
});
