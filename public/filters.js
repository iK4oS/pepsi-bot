export const CHANNELS = Object.freeze({
  food: '1156474286303891486',
  pets: '1096355083823890452'
});

export function channelForRoute(pathname = '/') {
  const route = pathname.toLocaleLowerCase().replace(/\/+$/, '') || '/';
  if (route === '/food') return CHANNELS.food;
  if (route === '/pets') return CHANNELS.pets;
  return null;
}

export function routeName(pathname = '/') {
  const channel = channelForRoute(pathname);
  if (channel === CHANNELS.food) return 'food';
  if (channel === CHANNELS.pets) return 'pets';
  return 'archive';
}

export function postChannelId(post) {
  if (post.channelId) return String(post.channelId);
  try {
    const parts = new URL(post.url).pathname.split('/');
    return parts[3] || null;
  } catch {
    return null;
  }
}

export function filterPostsForRoute(posts, pathname = '/') {
  const channelId = channelForRoute(pathname);
  return channelId ? posts.filter(post => postChannelId(post) === channelId) : posts;
}
