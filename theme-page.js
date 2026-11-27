// One theme's page, from `theme.html?name=<name>`: a large sketch, who made it, its palette,
// and buttons to download it or edit a copy in the theme maker.
import './site.js';
import { COLORS, credit, downloadLink, element, fetchThemes, palette, sketch } from './theme-kit.js';

const status = document.getElementById('theme-status');
const page = document.getElementById('theme');
const name = new URLSearchParams(location.search).get('name') ?? '';

function show(t) {
  const colors = palette(t);
  document.title = `${t.title}: Ultracord theme`;
  document.getElementById('crumb').textContent = t.title;
  document.getElementById('main-title').textContent = t.title;
  document.getElementById('theme-description').textContent = t.description;
  document.getElementById('theme-preview').replaceChildren(sketch(t));
  document.getElementById('theme-meta').replaceChildren(
    element('li', {}, 'by ', element('strong', { textContent: t.author })),
    element('li', { textContent: `v${t.version}` }),
    ...credit(t));
  document.getElementById('theme-actions').replaceChildren(
    downloadLink(t, 'button'),
    element('a', { className: 'button button-ghost', href: `create.html?from=${encodeURIComponent(t.name)}`, textContent: 'Edit a copy' }));

  const rows = COLORS.map(([key, label, hint]) => {
    const swatch = element('span', { className: 'palette-swatch' });
    swatch.style.setProperty('--c', colors[key]);
    return [
      element('dt', {}, label, element('span', { className: 'help', textContent: hint })),
      element('dd', {}, swatch, element('code', { textContent: colors[key] })),
    ];
  }).flat();
  const radius = typeof t.radiusScale === 'number' ? t.radiusScale : 1;
  rows.push(
    element('dt', {}, 'Corners', element('span', { className: 'help', textContent: '0 is square, 1 is Discord\'s own' })),
    element('dd', {}, element('code', { textContent: radius.toFixed(2) })));
  document.getElementById('theme-palette').replaceChildren(...rows);

  page.style.setProperty('--tp-accent', colors['accent-color']);
  page.hidden = false;
  status.hidden = true;
}

async function load() {
  try {
    const theme = (await fetchThemes()).find((t) => t.name === name);
    if (theme) show(theme);
    else status.replaceChildren('This theme is not in the store. ', element('a', { href: 'themes.html', textContent: 'See all themes' }), '.');
  } catch {
    status.textContent = 'The theme could not be loaded. Try again in a moment.';
  }
}

load();
