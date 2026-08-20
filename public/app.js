import { centeredColumnCount, masonryLayout } from './layout.js';
import { BUILD_INFO_URL, buildInfoPayload } from './build-info.js';
import { filterPostsForRoute, routeName } from './filters.js';
import { lightboxPayload, shouldCloseFromTarget } from './lightbox.js';
import { setMediaSource, setMediaSources, useMediaFallback } from './media-fallback.js';
import { imageMediaPayload, shouldOpenImageLightbox, videoMediaPayload } from './media-performance.js';
import { matchesPost } from './search.js';
import { initialTheme, nextTheme, syncDarkReaderLock } from './theme.js';
import { pauseVideos, shouldPauseOffscreenVideo } from './video-visibility.js';

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
const buildRevision = document.querySelector('#build-revision');
const buildDate = document.querySelector('#build-date');
const activeRoute = routeName(window.location.pathname);

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
let allPosts = [];
let postCount = 0;
let layoutFrame = 0;

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
  syncDarkReaderLock(theme);
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

function layoutCollage() {
  const columns = centeredColumnCount(postCount, window.innerWidth);
  collage.style.setProperty('--columns', columns);
  const posts = [...collage.querySelectorAll('.post')];
  if (!posts.length) {
    collage.style.height = '0px';
    return;
  }
  const gap = Number.parseFloat(getComputedStyle(collage).getPropertyValue('--gap')) || 16;
  const columnWidth = (collage.clientWidth - gap * (columns - 1)) / columns;
  for (const post of posts) post.style.width = `${columnWidth}px`;
  const layout = masonryLayout(posts.map(post => post.getBoundingClientRect().height), columns, columnWidth, gap);
  for (const [index, post] of posts.entries()) {
    const { x, y } = layout.items[index];
    post.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  collage.style.height = `${layout.height}px`;
}

function scheduleCollageLayout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(layoutCollage);
}

const postResizeObserver = new ResizeObserver(scheduleCollageLayout);
const videoVisibilityObserver = new IntersectionObserver(entries => {
  const fullscreenElement = document.fullscreenElement ?? document.webkitFullscreenElement;
  for (const entry of entries) {
    if (shouldPauseOffscreenVideo(entry, fullscreenElement)) entry.target.pause();
  }
});

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
    const link = document.createElement('a');
    link.className = 'image-link';
    const img = document.createElement('img');
    const sources = imageMediaPayload(image);
    const fullSrc = new URL(assetPath(sources.fullSrc), window.location.href).href;
    link.href = fullSrc;
    setMediaSources(img, [assetPath(sources.previewSrc), fullSrc, sources.fallbackUrl]);
    img.addEventListener('error', () => useMediaFallback(img));
    const payload = lightboxPayload(post, index);
    img.alt = payload.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    if (image.width) img.width = image.width;
    if (image.height) img.height = image.height;
    link.setAttribute('aria-label', `Enlarge ${payload.alt}`);
    link.addEventListener('click', event => {
      if (!shouldOpenImageLightbox(event)) return;
      event.preventDefault();
      openLightbox(post, index);
    });
    link.append(img);
    media.append(link);
  }
  for (const [index, item] of (post.videos ?? []).entries()) {
    const video = document.createElement('video');
    const sources = videoMediaPayload(item);
    setMediaSource(video, assetPath(sources.src), sources.fallbackUrl);
    video.addEventListener('error', () => useMediaFallback(video));
    video.controls = true;
    video.preload = sources.preload;
    if (sources.poster) video.poster = assetPath(sources.poster);
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
  postResizeObserver.disconnect();
  videoVisibilityObserver.disconnect();
  pauseVideos(collage.querySelectorAll('video'));
  collage.replaceChildren();
  postCount = filtered.length;
  for (const post of filtered) collage.append(renderPost(post));
  for (const post of collage.querySelectorAll('.post')) postResizeObserver.observe(post);
  for (const video of collage.querySelectorAll('video')) videoVisibilityObserver.observe(video);
  layoutCollage();

  const searching = query.trim().length > 0;
  empty.hidden = filtered.length !== 0;
  empty.querySelector('h1').textContent = searching ? 'No matching posts.' : 'No photographs yet.';
  empty.querySelector('p').textContent = searching
    ? 'Try another message ID or title.'
    : 'New visual posts will appear here automatically.';
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

async function loadBuildInfo() {
  try {
    const response = await fetch(BUILD_INFO_URL, {
      cache: 'no-cache',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) return;
    const payload = buildInfoPayload(await response.json());
    if (!payload) return;
    buildRevision.textContent = payload.revisionLabel;
    buildDate.textContent = ` ${payload.dateLabel}`;
    buildRevision.href = payload.href;
    buildRevision.title = `GitHub revision committed ${payload.isoDate}`;
  } catch {}
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
window.addEventListener('resize', scheduleCollageLayout, { passive: true });
load();
loadBuildInfo();
