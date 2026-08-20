export function initialTheme(savedTheme) {
  return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
}

export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

export function syncDarkReaderLock(theme, root = document) {
  const colorScheme = root.querySelector('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.content = theme;

  const lock = root.querySelector('meta[name="darkreader-lock"]');
  if (theme === 'dark' && !lock) {
    const meta = root.createElement('meta');
    meta.name = 'darkreader-lock';
    root.head.append(meta);
  } else if (theme === 'light') {
    lock?.remove();
  }
}
