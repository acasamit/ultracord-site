// The theme maker: colors, corner rounding and a header, a live sketch of Discord, the store's
// readability checks, and the `.theme.css` to download or propose as a pull request.
import './site.js';
import { COLORS, CONTRAST, DISCORD, contrast, element, fetchThemes, paintSketch, saveFile, sketch } from './theme-kit.js';

const NEW_FILE = 'https://github.com/acasamit/ultracord/new/main';
const DRAFT = 'ultracord-theme-draft';
const HEX_INPUT = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const form = document.getElementById('theme-form');
const startFrom = document.getElementById('start-from');
const colorRows = document.getElementById('color-rows');
const radius = document.getElementById('radius-scale');
const radiusValue = document.getElementById('radius-value');
const nitro = document.getElementById('override-nitro');
const nameInput = document.getElementById('theme-name');
const descriptionInput = document.getElementById('theme-description');
const authorInput = document.getElementById('theme-author');
const preview = document.getElementById('preview');
const checks = document.getElementById('checks');
const fileName = document.getElementById('file-name');
const code = document.getElementById('theme-css');
const download = document.getElementById('download');
const propose = document.getElementById('propose');
const proposeStatus = document.getElementById('propose-status');

let catalog = [];

/* One row per color: the native picker and its hex value, kept in sync. */

const fields = {};
for (const [key, label, hint] of COLORS) {
  const id = `color-${key}`;
  const picker = element('input', { type: 'color', value: DISCORD[key] });
  picker.setAttribute('aria-label', `Pick the ${label.toLowerCase()} color`);
  const hex = element('input', {
    type: 'text', id, className: 'hex', value: DISCORD[key], maxLength: 7,
    autocomplete: 'off', spellcheck: false, autocapitalize: 'none',
  });
  hex.setAttribute('aria-describedby', `${id}-hint`);
  colorRows.append(element('div', { className: 'color-row' },
    element('span', { className: 'color-name' },
      element('label', { htmlFor: id, textContent: label }),
      element('span', { id: `${id}-hint`, className: 'help', textContent: hint })),
    picker, hex));

  picker.addEventListener('input', () => {
    hex.value = picker.value;
    hex.removeAttribute('aria-invalid');
    update();
  });
  hex.addEventListener('input', () => {
    const match = HEX_INPUT.exec(hex.value.trim());
    if (!match) {
      hex.setAttribute('aria-invalid', 'true');
      return;
    }
    hex.removeAttribute('aria-invalid');
    let digits = match[1].toLowerCase();
    if (digits.length === 3) digits = [...digits].map((c) => c + c).join('');
    picker.value = `#${digits}`;
    update();
  });
  // A value left half typed goes back to the last good one.
  hex.addEventListener('change', () => {
    hex.value = picker.value;
    hex.removeAttribute('aria-invalid');
  });
  fields[key] = { picker, hex };
}

function setColors(colors, radiusScale = 1) {
  for (const [key, { picker, hex }] of Object.entries(fields)) {
    const value = /^#[0-9a-f]{6}/i.exec(colors[key] ?? '')?.[0].toLowerCase() ?? DISCORD[key];
    picker.value = value;
    hex.value = value;
    hex.removeAttribute('aria-invalid');
  }
  radius.value = String(Math.min(2.5, Math.max(0, Number(radiusScale) || 0)));
}

/* The theme as typed, and its file. */

const oneLine = (text) => text.replace(/\*\//g, '').replace(/\s+/g, ' ').trim();

function slug(text) {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function current() {
  return {
    colors: Object.fromEntries(Object.entries(fields).map(([key, { picker }]) => [key, picker.value])),
    radiusScale: Number(radius.value),
    nitro: nitro.checked,
    name: oneLine(nameInput.value),
    description: oneLine(descriptionInput.value),
    author: oneLine(authorInput.value),
  };
}

function css(t) {
  const lines = [
    '/**',
    ` * @name ${t.name || 'My Theme'}`,
    ` * @description ${t.description || 'A theme made on ultracord.dev.'}`,
    ' * @version 1.0.0',
    ` * @author ${t.author || 'you'}`,
    ' */',
    ':root {',
    ...COLORS.map(([key]) => `  --${key}: ${t.colors[key]};`),
  ];
  if (t.radiusScale !== 1) lines.push(`  --radius-scale: ${t.radiusScale};`);
  if (!t.nitro) lines.push('  --override-nitro: false;');
  lines.push('}', '');
  return lines.join('\n');
}

/* Everything that follows the inputs: preview, checks, code, proposal link and the draft. */

const previewSketch = sketch({ colors: DISCORD });
preview.append(previewSketch);

function update() {
  const t = current();
  paintSketch(previewSketch, t);
  radiusValue.textContent = t.radiusScale.toFixed(2);

  let readable = true;
  checks.replaceChildren(...CONTRAST.map(([text, bg, min, label]) => {
    const ratio = contrast(t.colors[text], t.colors[bg]);
    const ok = ratio >= min;
    readable &&= ok;
    return element('li', { className: ok ? 'is-ok' : 'is-low' },
      // Rounded down, so a ratio shown at the minimum always passes.
      `${label} `, element('strong', { textContent: `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1` }),
      element('span', { className: 'visually-hidden', textContent: ok ? ', readable' : `, too low, needs ${min}:1` }),
      ok ? '' : element('span', { className: 'needs', textContent: ` needs ${min}`, ariaHidden: 'true' }));
  }));

  const name = slug(t.name);
  const file = `${name || 'my-theme'}.theme.css`;
  const text = css(t);
  fileName.textContent = name ? `themes/${name}/${file}` : file;
  code.textContent = text;

  const taken = catalog.find((theme) => theme.name === name);
  const missing = [
    !name && (t.name ? 'a name with some Latin letters or digits' : 'a name'),
    taken && `another name (Ultracord already has ${taken.title})`,
    !t.description && 'a description',
    !t.author && 'your GitHub name',
    !readable && 'more readable text (see the checks above the preview)',
  ].filter(Boolean);
  if (missing.length) {
    propose.removeAttribute('href');
    propose.setAttribute('aria-disabled', 'true');
    proposeStatus.textContent = `To propose it, it needs ${list(missing)}.`;
  } else {
    const params = new URLSearchParams({ filename: `themes/${name}/${file}`, value: text });
    propose.href = `${NEW_FILE}?${params}`;
    propose.removeAttribute('aria-disabled');
    proposeStatus.textContent = 'Ready to propose.';
  }
  saveDraft(t);
}

function list(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/* The draft stays in this browser, so a reload keeps the work. */

function saveDraft(t) {
  try {
    localStorage.setItem(DRAFT, JSON.stringify({ ...t, start: startFrom.value }));
  } catch {}
}

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT) ?? 'null');
    if (!draft || typeof draft !== 'object' || !draft.colors) return false;
    setColors(draft.colors, draft.radiusScale);
    nitro.checked = draft.nitro !== false;
    nameInput.value = String(draft.name ?? '');
    descriptionInput.value = String(draft.description ?? '');
    authorInput.value = String(draft.author ?? '');
    return String(draft.start ?? '');
  } catch {
    return false;
  }
}

/* Start from a store theme. */

startFrom.addEventListener('change', () => {
  const theme = catalog.find((t) => t.name === startFrom.value);
  setColors(theme ? theme.colors : DISCORD, theme?.radiusScale ?? 1);
  update();
});

async function loadCatalog(selected) {
  try {
    catalog = await fetchThemes();
  } catch {
    return;
  }
  startFrom.append(...catalog.map((t) => element('option', { value: t.name, textContent: t.title })));
  // "Edit a copy" on a theme's page opens the maker with ?from=<name>. The parameter goes once
  // used, so a reload keeps the edits.
  const from = catalog.find((t) => t.name === new URLSearchParams(location.search).get('from'));
  if (from) {
    startFrom.value = from.name;
    setColors(from.colors, from.radiusScale ?? 1);
    history.replaceState(null, '', location.pathname);
  } else if (selected && catalog.some((t) => t.name === selected)) {
    startFrom.value = selected;
  }
  update();
}

form.addEventListener('input', (event) => {
  if (!event.target.closest('.color-row')) update();
});
form.addEventListener('submit', (event) => event.preventDefault());

download.addEventListener('click', () => {
  const t = current();
  saveFile(new Blob([css(t)], { type: 'text/css' }), `${slug(t.name) || 'my-theme'}.theme.css`);
});

propose.addEventListener('click', (event) => {
  if (propose.getAttribute('aria-disabled') !== 'true') {
    // GitHub fills the new file from the link; the clipboard is there in case it does not.
    navigator.clipboard?.writeText(code.textContent).then(
      () => (proposeStatus.textContent = 'GitHub opens in a new tab. The code is copied too, if its editor is empty.'),
      () => {});
    return;
  }
  event.preventDefault();
  proposeStatus.textContent = '';
  requestAnimationFrame(() => update());
});

const restored = loadDraft();
update();
loadCatalog(restored || '');
