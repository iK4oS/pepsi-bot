export function lightboxPayload(post, index) {
  const image = post.images[index];
  const multiple = post.images.length > 1;
  return {
    src: image.src,
    alt: multiple ? `${post.text} — image ${index + 1} of ${post.images.length}` : post.text,
    caption: post.text
  };
}

export function shouldCloseFromTarget(target, dialog, figure) {
  return target === dialog || target === figure;
}
