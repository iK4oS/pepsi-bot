import test from 'node:test';
import assert from 'node:assert/strict';
import { pauseVideos, shouldPauseOffscreenVideo } from '../public/video-visibility.js';

const playingVideo = { paused: false };

test('pauses a playing video only after it leaves the viewport', () => {
  assert.equal(shouldPauseOffscreenVideo({ isIntersecting: false, target: playingVideo }), true);
  assert.equal(shouldPauseOffscreenVideo({ isIntersecting: true, target: playingVideo }), false);
  assert.equal(shouldPauseOffscreenVideo({ isIntersecting: false, target: { paused: true } }), false);
});

test('does not pause the active fullscreen video', () => {
  assert.equal(shouldPauseOffscreenVideo({ isIntersecting: false, target: playingVideo }, playingVideo), false);
  assert.equal(shouldPauseOffscreenVideo({ isIntersecting: false, target: { paused: false, webkitDisplayingFullscreen: true } }), false);
});

test('pauses playing videos before a gallery rerender', () => {
  let pauses = 0;
  pauseVideos([
    { paused: false, pause() { pauses += 1; } },
    { paused: true, pause() { pauses += 1; } }
  ]);
  assert.equal(pauses, 1);
});
