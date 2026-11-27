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

/** Saves `<name>.theme.css`: the file is on another origin, where `download` alone opens it. */
export function downloadLink(t, className = 'button button-small button-ghost') {
  const link = element('a', { className, href: t.url },
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
  return element('li', {}, article);
}
