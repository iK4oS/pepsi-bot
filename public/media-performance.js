export function imageMediaPayload(item) {
  return {
    previewSrc: item.thumbnailSrc || item.src,
    fullSrc: item.src,
    ...(item.fallbackUrl ? { fallbackUrl: item.fallbackUrl } : {})
  };
}

export function videoMediaPayload(item) {
  return {
    src: item.src,
    ...(item.thumbnailSrc ? { poster: item.thumbnailSrc } : {}),
    preload: 'none',
    ...(item.fallbackUrl ? { fallbackUrl: item.fallbackUrl } : {})
  };
}

export function upgradeImageToFullResolution(image) {
  const fullSrc = image.dataset.fullSrc;
  if (!fullSrc || image.src === fullSrc) return false;
  image.src = fullSrc;
  return true;
}
