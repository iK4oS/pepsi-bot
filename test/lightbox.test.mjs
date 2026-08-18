import test from 'node:test';
import assert from 'node:assert/strict';
import { lightboxPayload, shouldCloseFromTarget } from '../public/lightbox.js';

test('lightbox uses the clicked image and post caption', () => {
  const post = { text: 'A caption', images: [{ src: 'media/one.jpg' }, { src: 'media/two.jpg' }] };
  assert.deepEqual(lightboxPayload(post, 1), {
    src: 'media/two.jpg',
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
