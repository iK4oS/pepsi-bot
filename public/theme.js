export function initialTheme(savedTheme) {
  return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
}

export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}
