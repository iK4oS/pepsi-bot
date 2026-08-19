import test from 'node:test';
import assert from 'node:assert/strict';
import { channelForRoute, filterPostsForRoute, postChannelId } from '../public/filters.js';

const food = '1156474286303891486';
const pets = '1096355083823890452';
const posts = [
  { id: '1', url: `https://discord.com/channels/731881028573986874/${food}/1` },
  { id: '2', url: `https://discord.com/channels/731881028573986874/${pets}/2` }
];

test('archive routes show every channel', () => {
  for (const path of ['/', '/archive', '/Archive/', '/unknown']) assert.equal(channelForRoute(path), null);
  assert.deepEqual(filterPostsForRoute(posts, '/').map(post => post.id), ['1', '2']);
});

test('food and pets routes select their Discord channels', () => {
  assert.equal(channelForRoute('/food'), food);
  assert.equal(channelForRoute('/pets/'), pets);
  assert.deepEqual(filterPostsForRoute(posts, '/food').map(post => post.id), ['1']);
  assert.deepEqual(filterPostsForRoute(posts, '/pets').map(post => post.id), ['2']);
});

test('post channel IDs work with explicit data and legacy Discord links', () => {
  assert.equal(postChannelId(posts[0]), food);
  assert.equal(postChannelId({ channelId: pets, url: '' }), pets);
});
