// The plugin catalog, with a search box and a copy button for each install link.
import './site.js';
import { NAME, element, source } from './theme-kit.js';

const CATALOG = 'https://assets.ultracord.dev/plugins/index.json';
const ACCESS = {
  network: 'Internet',
  'discord-api': 'Discord API',
  'intercepts-discord-api': 'Changes Discord API requests',
  'edits-outgoing-messages': 'Edits sent messages',
  'reads-local-cache': 'Reads local cache',
  'native-bridge': 'Native functions',
};

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

async function load() {
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
load();
