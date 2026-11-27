// Shared by the home page and the theme maker: the theme catalog, Discord's default colors, the
// sketch of Discord drawn in a palette, and the readability rules the store checks.

export const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const THEMES = 'https://assets.ultracord.dev/themes/index.json';
export const HEX = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

// Discord's own dark colors, for what a theme leaves unset.
export const DISCORD = {
  'bg-tertiary': '#1e1f22',
  'bg-secondary': '#2b2d31',
  'bg-primary': '#313338',
  'bg-elevated': '#383a40',
  'accent-color': '#5865f2',
  'text-normal': '#dbdee1',
  'text-muted': '#949ba4',
  'ui-border-color': '#3f4147',
};

/** The colors a theme sets: the variable, a short name and what it paints. */
export const COLORS = [
  ['bg-tertiary', 'Server list', 'The darkest level, behind the server icons'],
  ['bg-secondary', 'Channels', 'The channel and member lists'],
  ['bg-primary', 'Chat', 'Behind the messages'],
  ['bg-elevated', 'Popups', 'Menus, popouts and the message box'],
  ['accent-color', 'Accent', 'Buttons, links and highlights'],
  ['text-normal', 'Text', 'Messages, names and titles'],
  ['text-muted', 'Secondary text', 'Timestamps, channel names, hints'],
  ['ui-border-color', 'Borders', 'Separators and outlines'],
];

// The store's readability rules, the same as `tools/themes.mjs` in the store's repository: text
// needs 4.5:1 on the chat and on the channels, secondary text 3:1 on the chat.
export const CONTRAST = [
  ['text-normal', 'bg-primary', 4.5, 'Text on chat'],
  ['text-normal', 'bg-secondary', 4.5, 'Text on channels'],
  ['text-muted', 'bg-primary', 3, 'Secondary text on chat'],
];

export function element(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/** A local preview can point a fetch at a sample file, like `?themes=./sample.json`. */
export function source(param, fallback) {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  return (local && new URLSearchParams(location.search).get(param)) || fallback;
}

export function isTheme(t) {
  return t && typeof t === 'object' && NAME.test(t.name) &&
    ['title', 'description', 'version', 'author', 'url'].every((key) => typeof t[key] === 'string') &&
    t.url.startsWith('https://assets.ultracord.dev/themes/') &&
    t.colors && typeof t.colors === 'object';
}

/** The store's themes: Ultracord's own first, then the other house themes, then the ports. */
export async function fetchThemes() {
  const res = await fetch(source('themes', THEMES), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rank = (t) => (t.name === 'ultracord' ? 0 : t.source ? 2 : 1);
  return (await res.json()).filter(isTheme).sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

export function palette(t) {
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

/** A small Discord window, server list, channels and chat with a popup, drawn in `t`'s palette. */
export function sketch(t) {
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
  paintSketch(root, t);
  return root;
}

/** Repaints a sketch, for live previews. */
export function paintSketch(root, t) {
  const colors = palette(t);
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
}

function luminance(hex) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of two `#rrggbb` colors. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hands the visitor a file to save. */
export function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  element('a', { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Theme cards and pages. */

export const themeHref = (t) => `theme.html?name=${encodeURIComponent(t.name)}`;

/** Whether the theme's chat background is light. */
export function isLight(t) {
  return luminance(palette(t)['bg-primary'].slice(0, 7)) > 0.4;
}

/** For a port of someone else's palette: a link to the original and its license. */
export function credit(t) {
  if (typeof t.source !== 'string' || !t.source.startsWith('https://')) return [];
  const license = typeof t.license === 'string' ? t.license : '';
  const short = license.split(',')[0].trim();
  return [element('li', { title: license },
    element('a', { href: t.source, rel: 'noopener', textContent: 'Original palette' }),
    short ? ` (${short})` : '')];
}

// Each theme version is also an asset of the store's `themes` release, where GitHub counts the
// downloads. The catalog gives its link as `download`.
const RELEASE = 'https://github.com/acasamit/ultracord/releases/download/themes/';

/**
 * The theme file. Through the release, GitHub serves it as an attachment and counts it. Without
 * one, it is fetched and saved as `<name>.theme.css`: on another origin, `download` alone opens it.
 */
export function downloadLink(t, className = 'button button-small button-ghost') {
  const release = typeof t.download === 'string' && t.download.startsWith(RELEASE) ? t.download : null;
  const link = element('a', { className, href: release ?? t.url },
    'Download', element('span', { className: 'visually-hidden', textContent: ` ${t.title}` }));
  if (release) return link;
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

/** A card with the theme's sketch and palette. The whole card opens the theme's page. */
export function themeCard(t) {
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
    element('h3', {}, element('a', { className: 'card-link', href: themeHref(t), textContent: t.title })),
    element('p', { textContent: t.description }),
    element('ul', { className: 'meta' },
      element('li', { textContent: `v${t.version}` }),
      element('li', { textContent: `by ${t.author}` }),
      ...credit(t)),
    swatches,
    element('footer', {}, downloadLink(t)));
  article.style.setProperty('--tp-accent', colors['accent-color']);
  article.dataset.theme = t.name;
  return element('li', {}, article);
}

/* Downloads, ratings and comments, which the store counts every hour and after each comment. */

const STATS = 'https://assets.ultracord.dev/themes/stats.json';
export const STAT_KEYS = ['downloads', 'rating', 'comments'];
const NOUNS = { downloads: 'download', comments: 'comment', rating: 'rating' };
const ICONS = {
  downloads: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  rating: 'M7.5 11v9h-3v-9zm0 0 3.6-7.1a1.8 1.8 0 0 1 3.3 1.2L13.6 9h5a2 2 0 0 1 2 2.4l-1.3 6.8a2.2 2.2 0 0 1-2.2 1.8H7.5',
  comments: 'M4 4.5h16v11H10l-6 4.5z',
};

/** The 👍 and 👎 on a theme's thread, as a share of positive ratings. */
export function rating(stats) {
  const up = stats?.up;
  const down = stats?.down;
  if (typeof up !== 'number' || typeof down !== 'number') return null;
  const votes = up + down;
  return { votes, percent: votes ? Math.round((up / votes) * 100) : null };
}

/**
 * How sure we are a theme is liked: the low end of the Wilson interval at 95%. A single 👍 then
 * ranks below 95% of 200 votes, which a plain percentage would not do.
 */
export function ratingScore(stats) {
  const r = rating(stats);
  if (!r?.votes) return -1;
  const z = 1.96;
  const n = r.votes;
  const p = stats.up / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
}

/** Each theme's counts, `{ name: { downloads, comments, reactions } }`, or null. */
export async function themeStats() {
  try {
    // A local preview can point at a sample file: ?stats=./sample.json
    const res = await fetch(source('stats', STATS), { cache: 'no-cache' });
    if (!res.ok) return null;
    const body = await res.json();
    return body && typeof body.themes === 'object' ? body.themes : null;
  } catch {
    return null;
  }
}

export const countText = (n, key) => `${n.toLocaleString('en')} ${NOUNS[key]}${n === 1 ? '' : 's'}`;

function icon(key) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[key]);
  svg.append(path);
  return svg;
}

/** The counts a theme has, zeros included, with an icon each. `labels` spells them out. */
export function statsRow(stats, labels = false) {
  const row = element('ul', { className: 'stats', ariaLabel: 'Stats' });
  for (const key of STAT_KEYS) {
    let short;
    let text;
    if (key === 'rating') {
      const r = rating(stats);
      if (!r) continue;
      short = r.votes ? `${r.percent}%` : 'New';
      text = r.votes ? `${r.percent}% positive (${countText(r.votes, 'rating')})` : 'No ratings yet';
    } else {
      const n = stats?.[key];
      if (typeof n !== 'number') continue;
      short = n.toLocaleString('en');
      text = countText(n, key);
    }
    row.append(element('li', { title: text }, icon(key),
      labels ? text : element('span', { ariaHidden: 'true', textContent: short }),
      labels ? '' : element('span', { className: 'visually-hidden', textContent: text })));
  }
  return row;
}

/** Adds the counts to every card under `root`. */
export function showStats(root, all) {
  if (!all) return;
  for (const card of root.querySelectorAll('.theme-card[data-theme]')) {
    if (card.querySelector('.stats')) continue;
    const row = statsRow(all[card.dataset.theme]);
    if (row.children.length) card.querySelector('.swatches').before(row);
  }
}
