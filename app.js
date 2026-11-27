// The home page: a few featured themes, with a link to all of them.
import './site.js';
import { downloadCounts, fetchThemes, showCounts, themeCard } from './theme-kit.js';

const FEATURED = 6;
const featured = document.getElementById('featured');
const status = document.getElementById('themes-status');
const all = document.getElementById('all-themes');

async function loadFeatured() {
  try {
    // Ultracord's own themes come first, then the ports.
    const themes = await fetchThemes();
    featured.replaceChildren(...themes.slice(0, FEATURED).map(themeCard));
    downloadCounts().then((counts) => showCounts(featured, counts));
    status.hidden = themes.length > 0;
    status.textContent = themes.length ? '' : 'No themes yet. The first ones are on their way.';
    if (themes.length) all.textContent = `See all ${themes.length} themes`;
  } catch {
    status.textContent = 'The themes could not be loaded. Try again in a moment.';
  }
}

loadFeatured();
