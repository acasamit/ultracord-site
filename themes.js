// Every theme, with a search box, a sort order and a dark or light filter. The sort is kept in the
// address, like `themes.html?sort=downloads`, so a sorted list can be shared.
import './site.js';
import { fetchThemes, isLight, showStats, themeCard, themeStats } from './theme-kit.js';

const list = document.getElementById('themes-catalog');
const status = document.getElementById('themes-status');
const search = document.getElementById('theme-search');
const sort = document.getElementById('theme-sort');
const tones = document.querySelectorAll('input[name="tone"]');

let entries = [];
let stats = null;

const stat = (entry, key) => stats?.[entry.theme.name]?.[key] ?? 0;
// The most first, ties in the featured order.
const most = (key) => (a, b) => stat(b, key) - stat(a, key) || a.rank - b.rank;
const ORDERS = {
  featured: (a, b) => a.rank - b.rank,
  downloads: most('downloads'),
  comments: most('comments'),
  reactions: most('reactions'),
  name: (a, b) => a.theme.title.localeCompare(b.theme.title),
};

function filter() {
  const query = search.value.trim().toLowerCase();
  const tone = document.querySelector('input[name="tone"]:checked').value;
  let shown = 0;
  for (const { theme, item } of entries) {
    const match = (!query || item.dataset.search.includes(query)) &&
      (tone === 'all' || (tone === 'light') === isLight(theme));
    item.hidden = !match;
    if (match) shown++;
  }
  if (!entries.length) return;
  const noun = (n) => `${n} ${n === 1 ? 'theme' : 'themes'}`;
  status.textContent = shown === entries.length ? `${noun(shown)}.` : `${shown} of ${noun(entries.length)}.`;
}

function order() {
  const by = ORDERS[sort.value] ?? ORDERS.featured;
  list.append(...[...entries].sort(by).map((entry) => entry.item));
  const url = new URL(location.href);
  if (sort.value === 'featured') url.searchParams.delete('sort');
  else url.searchParams.set('sort', sort.value);
  history.replaceState(null, '', url);
}

async function load() {
  const wanted = new URLSearchParams(location.search).get('sort');
  if (wanted && wanted in ORDERS) sort.value = wanted;
  try {
    // A local preview can point at a sample file: ?themes=./sample.json
    const themes = await fetchThemes();
    entries = themes.map((theme, rank) => {
      const item = themeCard(theme);
      item.dataset.search = `${theme.title} ${theme.description} ${theme.author}`.toLowerCase();
      return { theme, item, rank };
    });
    list.replaceChildren(...entries.map((entry) => entry.item));
    if (!entries.length) {
      status.textContent = 'No themes yet. The first ones are on their way.';
      return;
    }
    filter();
    order();
  } catch {
    status.textContent = 'The themes could not be loaded. Try again in a moment.';
    return;
  }
  stats = await themeStats();
  showStats(list, stats);
  // Without counts, only the featured and name orders mean anything.
  for (const option of sort.options) {
    if (!['featured', 'name'].includes(option.value)) option.disabled = !stats;
  }
  if (!stats && sort.selectedOptions[0]?.disabled) sort.value = 'featured';
  order();
}

search.addEventListener('input', filter);
sort.addEventListener('change', order);
for (const tone of tones) tone.addEventListener('change', filter);
load();
