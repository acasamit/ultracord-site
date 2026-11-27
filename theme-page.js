// One theme's page, from `theme.html?name=<name>`, laid out like an add-on page on
// betterdiscord.app: the title with who made it and a rating badge, then the preview with an
// Actions and About sidebar, then how to use it and the comments.
import './site.js';
import { STAT_ICONS, countText, downloadLink, element, fetchThemes, palette, rating, sketch, svgIcon, themeStats } from './theme-kit.js';

// Comments and reactions live in the store repository's GitHub Discussions, through giscus, in
// the "Theme comments" category (Announcement format: only giscus and maintainers open threads).
const GISCUS = {
  repoId: 'R_kgDOV83rOg',
  category: 'Theme comments',
  categoryId: 'DIC_kwDOV83rOs4DMGoM',
};
const SOURCE = 'https://github.com/acasamit/ultracord/blob/main/themes/';
const EDIT = 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 8.5l3 3';
// GitHub's mark (Octicons, MIT).
const GITHUB = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z';

const status = document.getElementById('theme-status');
const page = document.getElementById('theme');
const name = new URLSearchParams(location.search).get('name') ?? '';
const day = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

const date = (iso) => {
  const parsed = iso ? new Date(iso) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? day.format(parsed) : null;
};

/** A button with an icon before its label. */
function withIcon(link, icon) {
  link.prepend(icon);
  return link;
}

/** The About card: each row a label and its value, rows without a value left out. */
function about(rows) {
  return rows.filter(([, value]) => value !== null && value !== undefined && value !== '')
    .flatMap(([label, value]) => [element('dt', { textContent: label }), element('dd', {}, value)]);
}

function show(t, stats) {
  const colors = palette(t);
  const s = stats?.[t.name];
  const r = rating(s);
  const downloads = typeof s?.downloads === 'number' ? countText(s.downloads, 'downloads') : null;
  const comments = typeof s?.comments === 'number' ? countText(s.comments, 'comments') : null;
  const updated = date(t.updated);

  document.title = `${t.title}: Ultracord theme`;
  document.getElementById('crumb').textContent = t.title;
  document.getElementById('main-title').textContent = t.title;
  document.getElementById('theme-description').textContent = t.description;
  document.getElementById('theme-meta').replaceChildren(...[
    element('li', {}, 'By ', element('strong', { textContent: t.author })),
    element('li', { textContent: `Version ${t.version}` }),
    updated && element('li', { textContent: `Updated ${updated}` }),
    downloads && element('li', { textContent: downloads }),
  ].filter(Boolean));

  // Like the Like button on betterdiscord.app: the share of 👍, which leads to where you vote.
  const badge = document.getElementById('theme-rating');
  if (r) {
    badge.replaceChildren(svgIcon(STAT_ICONS.rating),
      r.votes ? `${r.percent}% positive` : 'Rate it',
      element('span', { className: 'rating-votes', textContent: r.votes ? countText(r.votes, 'rating') : 'No ratings yet' }));
    badge.hidden = false;
  }

  document.getElementById('theme-preview').replaceChildren(sketch(t));

  document.getElementById('theme-actions').replaceChildren(
    withIcon(downloadLink(t, 'button'), svgIcon(STAT_ICONS.downloads, { className: 'button-icon' })),
    withIcon(element('a', { className: 'button button-ghost', href: `create.html?from=${encodeURIComponent(t.name)}`, textContent: 'Edit a copy' }),
      svgIcon(EDIT, { className: 'button-icon' })),
    withIcon(element('a', { className: 'button button-ghost', href: `${SOURCE}${t.name}/${t.name}.theme.css`, textContent: 'Source' }),
      svgIcon(GITHUB, { viewBox: '0 0 16 16', fill: true, className: 'button-icon' })));

  const radius = typeof t.radiusScale === 'number' ? t.radiusScale : 1;
  const original = typeof t.source === 'string' && t.source.startsWith('https://')
    ? element('a', { href: t.source, textContent: new URL(t.source).hostname.replace(/^www\./, '') })
    : null;
  document.getElementById('theme-about').replaceChildren(...about([
    ['Author', t.author],
    ['Version', t.version],
    ['Added', date(t.added)],
    ['Updated', updated],
    ['Downloads', typeof s?.downloads === 'number' ? s.downloads.toLocaleString('en') : null],
    ['Rating', r ? (r.votes ? `${r.percent}% positive, ${countText(r.votes, 'rating')}` : 'No ratings yet') : null],
    ['Comments', typeof s?.comments === 'number' ? s.comments.toLocaleString('en') : null],
    ['Corners', radius === 1 ? "Discord's own" : `${radius} × Discord's`],
    ['Size', typeof t.size === 'number' ? `${t.size.toLocaleString('en')} bytes` : null],
    ['Palette', original],
    ['License', original && typeof t.license === 'string' ? t.license : null],
    ['SHA-256', typeof t.sha256 === 'string' ? element('code', { title: t.sha256, textContent: `${t.sha256.slice(0, 16)}…` }) : null],
  ]));

  page.style.setProperty('--tp-accent', colors['accent-color']);
  page.hidden = false;
  status.hidden = true;
  comments(t);
}

/** The giscus thread for this theme, loaded once the section comes near so a quick visit never reaches GitHub. */
function comments(t) {
  if (!GISCUS) return;
  const section = document.getElementById('comments');
  section.hidden = false;
  const load = () => {
    const script = element('script', { src: 'https://giscus.app/client.js', async: true, crossOrigin: 'anonymous' });
    Object.assign(script.dataset, {
      repo: 'acasamit/ultracord',
      repoId: GISCUS.repoId,
      category: GISCUS.category,
      categoryId: GISCUS.categoryId,
      mapping: 'specific',
      term: `theme:${t.name}`,
      strict: '1',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'top',
      theme: 'transparent_dark',
      lang: 'en',
    });
    document.getElementById('giscus').append(script);
  };
  new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    load();
  }, { rootMargin: '400px' }).observe(section);
}

async function load() {
  try {
    const [themes, stats] = await Promise.all([fetchThemes(), themeStats()]);
    const theme = themes.find((t) => t.name === name);
    if (theme) show(theme, stats);
    else status.replaceChildren('This theme is not in the store. ', element('a', { href: 'themes.html', textContent: 'See all themes' }), '.');
  } catch {
    status.textContent = 'The theme could not be loaded. Try again in a moment.';
  }
}

load();
