import test from 'node:test';
import assert from 'node:assert/strict';
import { lightboxPayload } from '../public/lightbox.js';

test('lightbox uses the clicked image and post caption', () => {
  const post = { text: 'A caption', images: [{ src: 'media/one.jpg' }, { src: 'media/two.jpg' }] };
  assert.deepEqual(lightboxPayload(post, 1), {
    src: 'media/two.jpg',
    alt: 'A caption — image 2 of 2',
    caption: 'A caption'
  });
});

test('single-image lightbox uses the caption as alt text', () => {
  const post = { text: 'A caption', images: [{ src: 'media/one.jpg' }] };
  assert.equal(lightboxPayload(post, 0).alt, 'A caption');
});
