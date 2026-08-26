import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lightboxPayload,
  neighborLightboxIndex,
  prepareLightboxImage,
  revealLightboxImage,
  resetLightboxImage,
  shouldCloseFromTarget,
  swapLightboxImage
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

test('lightbox navigation moves through the gallery and wraps at both ends', () => {
  assert.equal(neighborLightboxIndex(1, 4, 1), 2);
  assert.equal(neighborLightboxIndex(1, 4, -1), 0);
  assert.equal(neighborLightboxIndex(3, 4, 1), 0);
  assert.equal(neighborLightboxIndex(0, 4, -1), 3);
});

test('lightbox navigation safely handles an empty gallery', () => {
  assert.equal(neighborLightboxIndex(0, 0, 1), -1);
});

test('lightbox swaps image elements so superseded request events stay isolated', () => {
  const attributes = new Map([['src', '/media/old.jpg']]);
  let inserted = null;
  const current = {
    hidden: false,
    dataset: { fallbackUrls: '["/media/old-fallback.jpg"]' },
    removeAttribute(name) { attributes.delete(name); },
    replaceWith(element) { inserted = element; }
  };
  const replacement = { hidden: true };

  assert.equal(swapLightboxImage(current, replacement), replacement);
  assert.equal(inserted, replacement);
  assert.equal(current.hidden, true);
  assert.equal(attributes.has('src'), false);
  assert.equal('fallbackUrls' in current.dataset, false);
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
