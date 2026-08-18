import { centeredColumnCount } from './layout.js';

const collage = document.querySelector('#collage');
const empty = document.querySelector('#empty');
const status = document.querySelector('#status');
const template = document.querySelector('#post-template');

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
let postCount = 0;

function centerCollage() {
  collage.style.setProperty('--columns', centeredColumnCount(postCount, window.innerWidth));
}

function renderPost(post) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector('.post');
  const media = fragment.querySelector('.media');
  if (post.images.length > 1) media.classList.add('multi');
  for (const [index, image] of post.images.entries()) {
    const img = document.createElement('img');
    img.src = image.src;
    img.alt = index === 0 ? post.text : `Additional image ${index + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (image.width) img.width = image.width;
    if (image.height) img.height = image.height;
    media.append(img);
  }
  fragment.querySelector('.caption').textContent = post.text;
  const time = fragment.querySelector('time');
  time.dateTime = post.date;
  time.textContent = dateFormatter.format(new Date(post.date));
  fragment.querySelector('.message-link').href = post.url;
  article.dataset.messageId = post.id;
  return fragment;
}

async function load() {
  try {
    const response = await fetch('data/posts.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    postCount = data.posts.length;
    centerCollage();
    for (const post of data.posts) collage.append(renderPost(post));
    empty.hidden = data.posts.length !== 0;
    status.textContent = `${data.posts.length} ${data.posts.length === 1 ? 'post' : 'posts'}`;
  } catch (error) {
    console.error(error);
    status.textContent = 'Could not load the collage';
    empty.hidden = false;
    empty.querySelector('h1').textContent = 'The collage is unavailable.';
    empty.querySelector('p').textContent = 'Please try again in a moment.';
  }
}

window.addEventListener('resize', centerCollage, { passive: true });
load();
