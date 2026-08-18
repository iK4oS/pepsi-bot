export function matchesPost(post, query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return String(post.id).includes(normalized) || post.text.toLocaleLowerCase().includes(normalized);
}
