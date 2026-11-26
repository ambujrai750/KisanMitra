import { KEYS } from './config/storage-keys.js';
import { read, write } from './utils/storage.js';

export function applyTheme() {
  const theme = read(KEYS.theme, 'light') === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function toggleTheme() {
  const next = read(KEYS.theme, 'light') === 'dark' ? 'light' : 'dark';
  write(KEYS.theme, next);
  document.documentElement.dataset.theme = next;
  return next;
}
