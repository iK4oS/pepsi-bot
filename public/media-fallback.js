export function setMediaSource(element, primaryUrl, fallbackUrl = '') {
  element.src = primaryUrl;
  delete element.dataset.fallbackAttempted;
  element.dataset.fallbackUrl = /^https?:\/\//i.test(fallbackUrl) ? fallbackUrl : '';
}

export function useMediaFallback(element) {
  const fallbackUrl = element.dataset.fallbackUrl;
  if (!fallbackUrl || element.dataset.fallbackAttempted) return false;
  element.dataset.fallbackAttempted = 'true';
  element.src = fallbackUrl;
  return true;
}
