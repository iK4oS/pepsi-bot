import { centeredColumnCount } from './layout.js';
import { filterPostsForRoute, routeName } from './filters.js';
import { lightboxPayload, shouldCloseFromTarget } from './lightbox.js';
import { setMediaSource, useMediaFallback } from './media-fallback.js';
import { matchesPost } from './search.js';
import { initialTheme, nextTheme } from './theme.js';

const collage = document.querySelector('#collage');
const empty = document.querySelector('#empty');
const status = document.querySelector('#status');
const search = document.querySelector('#post-search');
const themeToggle = document.querySelector('#theme-toggle');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxCaption = lightbox.querySelector('figcaption');
const lightboxFigure = lightbox.querySelector('figure');
const lightboxClose = lightbox.querySelector('.lightbox-close');
const template = document.querySelector('#post-template');
const activeRoute = routeName(window.location.pathname);

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
let allPosts = [];
let postCount = 0;

for (const link of document.querySelectorAll('.section-nav a')) {
  if (link.dataset.route === activeRoute) link.setAttribute('aria-current', 'page');
}
document.title = `Pepsi Cat / ${activeRoute[0].toUpperCase()}${activeRoute.slice(1)}`;

function assetPath(src) {
  return src.startsWith('/') ? src : `/${src}`;
}

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

function openLightbox(post, index) {
  const payload = lightboxPayload(post, index);
  setMediaSource(lightboxImage, assetPath(payload.src), payload.fallbackUrl);
  lightboxImage.alt = payload.alt;
  lightboxCaption.textContent = payload.caption;
  lightbox.showModal();
}

function renderPost(post) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector('.post');
  const media = fragment.querySelector('.media');
  const mediaCount = post.images.length + (post.videos?.length ?? 0);
  if (mediaCount > 1) media.classList.add('multi');
  for (const [index, image] of post.images.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'image-button';
    const img = document.createElement('img');
    setMediaSource(img, assetPath(image.src), image.fallbackUrl);
    img.addEventListener('error', () => useMediaFallback(img));
    const payload = lightboxPayload(post, index);
    img.alt = payload.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (image.width) img.width = image.width;
    if (image.height) img.height = image.height;
    button.setAttribute('aria-label', `Enlarge ${payload.alt}`);
    button.addEventListener('click', () => openLightbox(post, index));
    button.append(img);
    media.append(button);
  }
  for (const [index, item] of (post.videos ?? []).entries()) {
    const video = document.createElement('video');
    setMediaSource(video, assetPath(item.src), item.fallbackUrl);
    video.addEventListener('error', () => useMediaFallback(video));
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.setAttribute('aria-label', `${post.text} — video ${index + 1} of ${post.videos.length}`);
    if (item.width) video.width = item.width;
    if (item.height) video.height = item.height;
    media.append(video);
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
  const scoped = filterPostsForRoute(allPosts, window.location.pathname);
  const filtered = scoped.filter(post => matchesPost(post, query));
  collage.replaceChildren();
  postCount = filtered.length;
  centerCollage();
  for (const post of filtered) collage.append(renderPost(post));

  const searching = query.trim().length > 0;
  empty.hidden = filtered.length !== 0;
  empty.querySelector('h1').textContent = searching ? 'No matching posts.' : 'No photographs yet.';
  empty.querySelector('p').textContent = searching
    ? 'Try another message ID or title.'
    : 'New posts with text and visual media will appear here automatically.';
  status.textContent = searching
    ? `${filtered.length} of ${scoped.length} posts`
    : `${scoped.length} ${scoped.length === 1 ? 'post' : 'posts'}`;
}

async function load() {
  try {
    const response = await fetch('/data/posts.json', { cache: 'no-cache' });
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
lightboxClose.addEventListener('click', () => lightbox.close());
lightboxImage.addEventListener('error', () => useMediaFallback(lightboxImage));
lightbox.addEventListener('click', event => {
  if (shouldCloseFromTarget(event.target, lightbox, lightboxFigure)) lightbox.close();
});
window.addEventListener('resize', centerCollage, { passive: true });
load();
