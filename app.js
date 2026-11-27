import './site.js';
import { COLORS, NAME, element, fetchThemes, palette, saveFile, sketch, source } from './theme-kit.js';

const CATALOG = 'https://assets.ultracord.dev/plugins/index.json';
const ACCESS = {
  network: 'Internet',
  'discord-api': 'Discord API',
  'intercepts-discord-api': 'Changes Discord API requests',
  'edits-outgoing-messages': 'Edits sent messages',
  'reads-local-cache': 'Reads local cache',
  'native-bridge': 'Native functions',
};

/* Catalog */

const list = document.getElementById('catalog');
const status = document.getElementById('catalog-status');
const search = document.getElementById('plugin-search');

function isListing(p) {
  return p && typeof p === 'object' && NAME.test(p.name) && p.name !== 'ultracord' &&
    ['description', 'version', 'author'].every((key) => typeof p[key] === 'string') &&
    Array.isArray(p.access) && Array.isArray(p.domains);
}

function card(p) {
  const urlId = `url-${p.name}`;
  const button = element('button', { type: 'button', className: 'copy-button' },
    'Copy link', element('span', { className: 'visually-hidden', textContent: ` to install ${p.name}` }));
  button.setAttribute('command', '--copy');
  button.setAttribute('commandfor', urlId);

  const access = [...p.access.map((key) => ACCESS[key] ?? key), ...p.domains];
  const article = element('article', { className: 'card' },
    element('h3', { textContent: p.name }),
    element('p', { textContent: p.description }),
    element('ul', { className: 'meta' },
      element('li', { textContent: `v${p.version}` }),
      element('li', { textContent: `by ${p.author}` })),
  );
  if (access.length) {
    article.append(element('ul', { className: 'access', ariaLabel: 'Can access' },
      ...access.map((label) => element('li', { textContent: label }))));
  }
  if (p.warning) article.append(element('p', { className: 'warning', textContent: p.warning }));
  article.append(element('footer', {},
    element('code', { id: urlId, className: 'visually-hidden', textContent: `https://assets.ultracord.dev/plugins/${p.name}.js` }),
    element('span', { className: 'copy' }, button, element('span', { className: 'tip', role: 'status' }))));

  const item = element('li', {}, article);
  item.dataset.search = `${p.name} ${p.description} ${p.author}`.toLowerCase();
  return item;
}

function filter() {
  const query = search.value.trim().toLowerCase();
  const items = [...list.children];
  let shown = 0;
  for (const item of items) {
    const match = !query || item.dataset.search.includes(query);
    item.hidden = !match;
    if (match) shown++;
  }
  if (!items.length) return;
  status.textContent = query
    ? `${shown} of ${items.length} plugins match "${search.value.trim()}".`
    : `${items.length} ${items.length === 1 ? 'plugin' : 'plugins'}.`;
}

async function loadCatalog() {
  try {
    // A local preview can point at a sample file: ?catalog=./sample.json
    const res = await fetch(source('catalog', CATALOG), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const plugins = (await res.json()).filter(isListing).sort((a, b) => a.name.localeCompare(b.name));
    list.replaceChildren(...plugins.map(card));
    if (!plugins.length) {
      status.textContent = 'No plugins yet. The first ones are being reviewed.';
      return;
    }
    filter();
  } catch {
    status.textContent = 'The catalog could not be loaded. Try again in a moment.';
  }
}

search.addEventListener('input', filter);
loadCatalog();

/* Themes: a card per theme, with a sketch of Discord drawn in its palette. */

const themeList = document.getElementById('themes-catalog');
const themeStatus = document.getElementById('themes-status');

function themeCard(t) {
  const colors = palette(t);
  const swatches = element('ul', { className: 'swatches', ariaLabel: 'Palette' },
    ...COLORS.slice(0, 7).map(([key, label]) => {
      const item = element('li', { title: `${label} ${colors[key]}` },
        element('span', { className: 'visually-hidden', textContent: `${label} ${colors[key]}` }));
      item.style.setProperty('--c', colors[key]);
      return item;
    }));
  const article = element('article', { className: 'card theme-card' },
    sketch(t),
    element('h3', { textContent: t.title }),
    element('p', { textContent: t.description }),
    element('ul', { className: 'meta' },
      element('li', { textContent: `v${t.version}` }),
      element('li', { textContent: `by ${t.author}` }),
      ...credit(t)),
    swatches,
    element('footer', {}, downloadLink(t)));
  article.style.setProperty('--tp-accent', colors['accent-color']);
  return element('li', {}, article);
}

/** For a port of someone else's palette: a link to the original and its license. */
function credit(t) {
  if (typeof t.source !== 'string' || !t.source.startsWith('https://')) return [];
  const license = typeof t.license === 'string' ? t.license : '';
  const short = license.split(',')[0].trim();
  return [element('li', { title: license },
    element('a', { href: t.source, rel: 'noopener', textContent: 'Original palette' }),
    short ? ` (${short})` : '')];
}

/** Saves `<name>.theme.css`: the file is on another origin, where `download` alone opens it. */
function downloadLink(t) {
  const link = element('a', { className: 'button button-small button-ghost', href: t.url },
    'Download', element('span', { className: 'visually-hidden', textContent: ` ${t.title}` }));
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      const res = await fetch(t.url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      saveFile(await res.blob(), `${t.name}.theme.css`);
    } catch {
      location.href = t.url;
    }
  });
  return link;
}

async function loadThemes() {
  try {
    // A local preview can point at a sample file: ?themes=./sample.json
    const themes = await fetchThemes();
    themeList.replaceChildren(...themes.map(themeCard));
    themeStatus.textContent = themes.length
      ? `${themes.length} ${themes.length === 1 ? 'theme' : 'themes'}.`
      : 'No themes yet. The first ones are on their way.';
  } catch {
    themeStatus.textContent = 'The themes could not be loaded. Try again in a moment.';
  }
}

loadThemes();
