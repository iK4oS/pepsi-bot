import test from 'node:test';
import assert from 'node:assert/strict';
import { setMediaSource, setMediaSources, useMediaFallback } from '../public/media-fallback.js';

test('failed local media switches once to its Discord attachment URL', () => {
  const element = { src: '', dataset: {} };
  setMediaSource(element, '/media/photo.jpg', 'https://cdn.discordapp.com/attachments/photo.jpg');

  assert.equal(element.src, '/media/photo.jpg');
  assert.equal(useMediaFallback(element), true);
  assert.equal(element.src, 'https://cdn.discordapp.com/attachments/photo.jpg');
  assert.equal(useMediaFallback(element), false);
});

test('media without an attachment fallback does not retry', () => {
  const element = { src: '', dataset: {} };
  setMediaSource(element, '/media/photo.jpg');
  assert.equal(useMediaFallback(element), false);
});

test('failed thumbnail falls back through the local original before Discord', () => {
  const element = { src: '', dataset: {} };
  setMediaSources(element, [
    '/media/thumbnails/photo.webp',
    '/media/photo.jpg',
    'https://cdn.discordapp.com/attachments/photo.jpg'
  ]);

  assert.equal(element.src, '/media/thumbnails/photo.webp');
  assert.equal(useMediaFallback(element), true);
  assert.equal(element.src, '/media/photo.jpg');
  assert.equal(useMediaFallback(element), true);
  assert.equal(element.src, 'https://cdn.discordapp.com/attachments/photo.jpg');
  assert.equal(useMediaFallback(element), false);
});
