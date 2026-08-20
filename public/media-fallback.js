function validMediaUrl(url) {
  return typeof url === 'string' && (/^https?:\/\//i.test(url) || url.startsWith('/'));
}

export function setMediaSources(element, urls) {
  const [primaryUrl, ...fallbackUrls] = [...new Set(urls.filter(validMediaUrl))];
  element.src = primaryUrl || '';
  element.dataset.fallbackUrls = JSON.stringify(fallbackUrls);
}

export function setMediaSource(element, primaryUrl, fallbackUrl = '') {
  setMediaSources(element, [primaryUrl, fallbackUrl]);
}

export function useMediaFallback(element) {
  let fallbackUrls;
  try { fallbackUrls = JSON.parse(element.dataset.fallbackUrls || '[]'); }
  catch { fallbackUrls = []; }
  const fallbackUrl = fallbackUrls.shift();
  if (!fallbackUrl) return false;
  element.dataset.fallbackUrls = JSON.stringify(fallbackUrls);
  element.src = fallbackUrl;
  return true;
}
