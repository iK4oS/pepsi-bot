export function lightboxPayload(post, index) {
  const image = post.images[index];
  const multiple = post.images.length > 1;
  return {
    src: image.src,
    ...(image.fallbackUrl ? { fallbackUrl: image.fallbackUrl } : {}),
    alt: multiple ? `${post.text} — image ${index + 1} of ${post.images.length}` : post.text,
    caption: post.text
  };
}

export function shouldCloseFromTarget(target, dialog, figure) {
  return target === dialog || target === figure;
}

export function prepareLightboxImage(image) {
  image.hidden = true;
}

export function revealLightboxImage(image) {
  image.hidden = false;
}

export function resetLightboxImage(image) {
  image.hidden = true;
  image.removeAttribute('src');
  delete image.dataset.fallbackUrls;
}
