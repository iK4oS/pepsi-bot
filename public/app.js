import { centeredColumnCount } from './layout.js';
import { matchesPost } from './search.js';
import { initialTheme, nextTheme } from './theme.js';

const collage = document.querySelector('#collage');
const empty = document.querySelector('#empty');
const status = document.querySelector('#status');
const search = document.querySelector('#post-search');
const themeToggle = document.querySelector('#theme-toggle');
const template = document.querySelector('#post-template');

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
let allPosts = [];
let postCount = 0;

function readSavedTheme() {
  try { return localStorage.getItem('theme'); } catch { return null; }
}

function applyTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  const light = theme === 'light';
  themeToggle.setAttribute('aria-pressed', String(light));
  themeToggle.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
  themeToggle.title = `Switch to ${light ? 'dark' : 'light'} theme`;
  if (persist) {
    try { localStorage.setItem('theme', theme); } catch {}
  }
}

let theme = initialTheme(readSavedTheme());
applyTheme(theme);

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

function renderResults(query = '') {
  const filtered = allPosts.filter(post => matchesPost(post, query));
  collage.replaceChildren();
  postCount = filtered.length;
  centerCollage();
  for (const post of filtered) collage.append(renderPost(post));

  const searching = query.trim().length > 0;
  empty.hidden = filtered.length !== 0;
  empty.querySelector('h1').textContent = searching ? 'No matching posts.' : 'No photographs yet.';
  empty.querySelector('p').textContent = searching
    ? 'Try another message ID or title.'
    : 'New posts with both text and images will appear here automatically.';
  status.textContent = searching
    ? `${filtered.length} of ${allPosts.length} posts`
    : `${allPosts.length} ${allPosts.length === 1 ? 'post' : 'posts'}`;
}

async function load() {
  try {
    const response = await fetch('data/posts.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allPosts = data.posts;
    renderResults();
  } catch (error) {
    console.error(error);
    status.textContent = 'Could not load the collage';
    empty.hidden = false;
    empty.querySelector('h1').textContent = 'The collage is unavailable.';
    empty.querySelector('p').textContent = 'Please try again in a moment.';
  }
}

search.addEventListener('input', () => renderResults(search.value));
search.addEventListener('keydown', event => {
  if (event.key === 'Escape' && search.value) {
    search.value = '';
    renderResults();
  }
});
themeToggle.addEventListener('click', () => {
  theme = nextTheme(theme);
  applyTheme(theme, true);
});
window.addEventListener('resize', centerCollage, { passive: true });
load();
