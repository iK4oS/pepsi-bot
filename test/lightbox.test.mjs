import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lightboxPayload,
  prepareLightboxImage,
  revealLightboxImage,
  resetLightboxImage,
  shouldCloseFromTarget
} from '../public/lightbox.js';

test('lightbox uses the clicked image, fallback, and post caption', () => {
  const post = { text: 'A caption', images: [{ src: 'media/one.jpg' }, { src: 'media/two.jpg', fallbackUrl: 'https://cdn.discordapp.com/two.jpg' }] };
  assert.deepEqual(lightboxPayload(post, 1), {
    src: 'media/two.jpg',
    fallbackUrl: 'https://cdn.discordapp.com/two.jpg',
    alt: 'A caption — image 2 of 2',
    caption: 'A caption'
  });
});

test('empty dialog and figure space closes while content clicks stay open', () => {
  const dialog = {};
  const figure = {};
  const image = {};
  assert.equal(shouldCloseFromTarget(dialog, dialog, figure), true);
  assert.equal(shouldCloseFromTarget(figure, dialog, figure), true);
  assert.equal(shouldCloseFromTarget(image, dialog, figure), false);
});

test('single-image lightbox uses the caption as alt text', () => {
  const post = { text: 'A caption', images: [{ src: 'media/one.jpg' }] };
  assert.equal(lightboxPayload(post, 0).alt, 'A caption');
});

test('lightbox hides stale pixels until the next image loads and resets on close', () => {
  const attributes = new Map([['src', '/media/previous.jpg']]);
  const image = {
    hidden: false,
    dataset: { fallbackUrls: '["/media/fallback.jpg"]' },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; }
  };

  prepareLightboxImage(image);
  assert.equal(image.hidden, true);

  revealLightboxImage(image);
  assert.equal(image.hidden, false);

  resetLightboxImage(image);
  assert.equal(image.hidden, true);
  assert.equal(image.getAttribute('src'), null);
  assert.equal('fallbackUrls' in image.dataset, false);
});
