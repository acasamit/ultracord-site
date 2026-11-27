// Every theme, with a search box and a dark or light filter.
import './site.js';
import { downloadCounts, fetchThemes, isLight, showCounts, themeCard } from './theme-kit.js';

const list = document.getElementById('themes-catalog');
const status = document.getElementById('themes-status');
const search = document.getElementById('theme-search');
const tones = document.querySelectorAll('input[name="tone"]');

let themes = [];

function filter() {
  const query = search.value.trim().toLowerCase();
  const tone = document.querySelector('input[name="tone"]:checked').value;
  let shown = 0;
  for (const [index, item] of [...list.children].entries()) {
    const t = themes[index];
    const match = (!query || item.dataset.search.includes(query)) &&
      (tone === 'all' || (tone === 'light') === isLight(t));
    item.hidden = !match;
    if (match) shown++;
  }
  if (!themes.length) return;
  const noun = (n) => `${n} ${n === 1 ? 'theme' : 'themes'}`;
  status.textContent = shown === themes.length ? `${noun(shown)}.` : `${shown} of ${noun(themes.length)}.`;
}

async function load() {
  try {
    // A local preview can point at a sample file: ?themes=./sample.json
    themes = await fetchThemes();
    list.replaceChildren(...themes.map((t) => {
      const item = themeCard(t);
      item.dataset.search = `${t.title} ${t.description} ${t.author}`.toLowerCase();
      return item;
    }));
    downloadCounts().then((counts) => showCounts(list, counts));
    if (!themes.length) {
      status.textContent = 'No themes yet. The first ones are on their way.';
      return;
    }
    filter();
  } catch {
    status.textContent = 'The themes could not be loaded. Try again in a moment.';
  }
}

search.addEventListener('input', filter);
for (const tone of tones) tone.addEventListener('change', filter);
load();
