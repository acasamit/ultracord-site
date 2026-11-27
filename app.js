const CATALOG = 'https://assets.ultracord.dev/plugins/index.json';
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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

/* Themes: a card per theme, with a sketch of Discord drawn in its palette. */

const THEMES = 'https://assets.ultracord.dev/themes/index.json';
const themeList = document.getElementById('themes-catalog');
const themeStatus = document.getElementById('themes-status');
// Discord's own dark colors, for what a theme leaves unset.
const DISCORD = {
  'bg-tertiary': '#1e1f22',
  'bg-secondary': '#2b2d31',
  'bg-primary': '#313338',
  'bg-elevated': '#383a40',
  'accent-color': '#5865f2',
  'text-normal': '#dbdee1',
  'text-muted': '#949ba4',
  'ui-border-color': '#3f4147',
};
const HEX = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const SWATCHES = [
  ['bg-tertiary', 'Server list'],
  ['bg-secondary', 'Channels'],
  ['bg-primary', 'Chat'],
  ['bg-elevated', 'Popups'],
  ['accent-color', 'Accent'],
  ['text-normal', 'Text'],
  ['text-muted', 'Secondary text'],
];

function isTheme(t) {
  return t && typeof t === 'object' && NAME.test(t.name) &&
    ['title', 'description', 'version', 'author', 'url'].every((key) => typeof t[key] === 'string') &&
    t.url.startsWith('https://assets.ultracord.dev/themes/') &&
    t.colors && typeof t.colors === 'object';
}

function palette(t) {
  const colors = { ...DISCORD };
  for (const [key, value] of Object.entries(t.colors)) if (key in colors && HEX.test(value)) colors[key] = value;
  return colors;
}

/** An empty element with these classes, and custom properties set through the CSSOM. */
function shape(classes, props = {}) {
  const node = element('span', { className: classes });
  for (const [key, value] of Object.entries(props)) node.style.setProperty(key, value);
  return node;
}

function sketch(t) {
  const colors = palette(t);
  const bar = (width, tone = '') => shape(`tp-bar ${tone}`, { '--w': `${width}%` });
  const message = (avatar, widths) => element('span', { className: 'tp-msg' },
    shape(`tp-avatar ${avatar}`),
    element('span', { className: 'tp-lines' }, bar(widths[0], 'is-strong'), ...widths.slice(1).map((w) => bar(w))));

  const root = element('div', { className: 'tp' },
    element('span', { className: 'tp-rail' },
      shape('tp-server is-home'), shape('tp-sep'), shape('tp-server is-active'), shape('tp-server'), shape('tp-server')),
    element('span', { className: 'tp-side' },
      bar(62, 'is-strong tp-name'),
      ...[48, 66, 40, 58, 52].map((w, i) => element('span', { className: `tp-row${i === 1 ? ' is-active' : ''}` },
        shape('tp-hash'), bar(w)))),
    element('span', { className: 'tp-chat' },
      element('span', { className: 'tp-head' }, shape('tp-hash'), bar(28, 'is-strong')),
      message('is-accent', [24, 86, 58]),
      element('span', { className: 'tp-new' }, shape('tp-pill')),
      message('', [30, 72]),
      element('span', { className: 'tp-pop' }, bar(70, 'is-strong'), bar(90), bar(55), shape('tp-btn')),
      element('span', { className: 'tp-input' }, bar(36))));
  root.setAttribute('aria-hidden', 'true');
  const vars = {
    '--tp-tertiary': colors['bg-tertiary'],
    '--tp-secondary': colors['bg-secondary'],
    '--tp-primary': colors['bg-primary'],
    '--tp-elevated': colors['bg-elevated'],
    '--tp-accent': colors['accent-color'],
    '--tp-text': colors['text-normal'],
    '--tp-muted': colors['text-muted'],
    '--tp-border': colors['ui-border-color'],
    '--tp-r': String(typeof t.radiusScale === 'number' ? t.radiusScale : 1),
  };
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  return root;
}

function themeCard(t) {
  const colors = palette(t);
  const swatches = element('ul', { className: 'swatches', ariaLabel: 'Palette' },
    ...SWATCHES.map(([key, label]) => {
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
      const blob = URL.createObjectURL(await res.blob());
      element('a', { href: blob, download: `${t.name}.theme.css` }).click();
      setTimeout(() => URL.revokeObjectURL(blob), 1000);
    } catch {
      location.href = t.url;
    }
  });
  return link;
}

async function loadThemes() {
  // A local preview can point at a sample file: ?themes=./sample.json
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const source = (local && new URLSearchParams(location.search).get('themes')) || THEMES;
  try {
    const res = await fetch(source, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Ultracord's own theme first, then the other house themes, then the ports, each by name.
    const rank = (t) => (t.name === 'ultracord' ? 0 : t.source ? 2 : 1);
    const themes = (await res.json()).filter(isTheme).sort((a, b) =>
      rank(a) - rank(b) || a.title.localeCompare(b.title));
    themeList.replaceChildren(...themes.map(themeCard));
    themeStatus.textContent = themes.length
      ? `${themes.length} ${themes.length === 1 ? 'theme' : 'themes'}.`
      : 'No themes yet. The first ones are on their way.';
  } catch {
    themeStatus.textContent = 'The themes could not be loaded. Try again in a moment.';
  }
}

loadThemes();
