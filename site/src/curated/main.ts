import '../shared/reset.css';
import '../hub/fonts.css';
import '../hub/tokens.css';
import './curated.css';

document.querySelector<HTMLButtonElement>('#collection-theme')?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('hub-theme', theme);
  } catch {
    /* Theme still works without storage. */
  }
});
