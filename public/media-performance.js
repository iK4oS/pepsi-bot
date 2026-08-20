export function imageMediaPayload(item) {
  return {
    previewSrc: item.thumbnailSrc || item.src,
    fullSrc: item.src,
    ...(item.fallbackUrl ? { fallbackUrl: item.fallbackUrl } : {})
  };
}

export function shouldOpenImageLightbox(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function videoMediaPayload(item) {
  return {
    src: item.src,
    ...(item.thumbnailSrc ? { poster: item.thumbnailSrc } : {}),
    preload: 'none',
    ...(item.fallbackUrl ? { fallbackUrl: item.fallbackUrl } : {})
  };
}
