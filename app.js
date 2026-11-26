const CATALOG = 'https://assets.ultracord.dev/plugins/index.json';
const NAME = /^ultra-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACCESS = {
  network: 'Internet',
  'discord-api': 'Discord API',
  'intercepts-discord-api': 'Changes Discord API requests',
  'edits-outgoing-messages': 'Edits sent messages',
  'reads-local-cache': 'Reads local cache',
  'native-bridge': 'Native functions',
};

/* Navigation: inline when every link fits, a popover menu otherwise. */

const header = document.querySelector('.site-header');
const row = header.querySelector('.header-inner');
const menu = document.getElementById('site-menu');
let lastWidth = 0;

function layoutNav() {
  const width = header.clientWidth;
  const wide = header.classList.contains('is-wide');
  // While collapsed, only a wider header can make the links fit again.
  if (!wide && width <= lastWidth) {
    lastWidth = width;
    return;
  }
  lastWidth = width;
  const wasOpen = menu.matches(':popover-open');
  header.classList.add('is-measuring', 'is-wide');
  menu.removeAttribute('popover');
  if (row.scrollWidth > row.clientWidth) {
    header.classList.remove('is-wide');
    menu.setAttribute('popover', 'auto');
    if (wasOpen) menu.showPopover();
  }
  requestAnimationFrame(() => header.classList.remove('is-measuring'));
}

const navObserver = new ResizeObserver(layoutNav);
navObserver.observe(header);
navObserver.observe(menu);

menu.addEventListener('click', (event) => {
  if (event.target.closest('a') && menu.matches(':popover-open')) menu.hidePopover();
});

/* Copy buttons: `command="--copy" commandfor="<id>"` copies that element's text. */

const timers = new WeakMap();
let lastMessage = '';

function report(button, ok) {
  const tip = button.nextElementSibling;
  clearTimeout(timers.get(button));
  button.removeAttribute('data-copied');
  button.removeAttribute('data-failed');
  let message = ok ? 'Copied' : 'Copy failed';
  if (message === lastMessage) message += ' ';
  lastMessage = message;
  tip.textContent = '';
  void button.offsetWidth;
  button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
  requestAnimationFrame(() => (tip.textContent = message));
  timers.set(button, setTimeout(() => {
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');
    tip.textContent = '';
  }, 2000));
}

async function copy(button, target) {
  const text = target.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    report(button, true);
  } catch {
    report(button, false);
  }
}

if ('CommandEvent' in window) {
  document.addEventListener('command', (event) => {
    if (event.command === '--copy') copy(event.source, event.target);
  }, true);
} else {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const button = event.target.closest('button[command="--copy"]');
    if (!button) return;
    const target = document.getElementById(button.getAttribute('commandfor'));
    if (target) copy(button, target);
  });
}

/* Catalog */

const list = document.getElementById('catalog');
const status = document.getElementById('catalog-status');
const search = document.getElementById('plugin-search');

function element(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function isListing(p) {
  return p && typeof p === 'object' && NAME.test(p.name) &&
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
  // A local preview can point at a sample file: ?catalog=./sample.json
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const source = (local && new URLSearchParams(location.search).get('catalog')) || CATALOG;
  try {
    const res = await fetch(source, { cache: 'no-cache' });
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
