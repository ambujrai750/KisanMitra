import { applyTheme, toggleTheme } from './theme.js';
applyTheme();
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-action=theme-toggle]')) toggleTheme();
});
