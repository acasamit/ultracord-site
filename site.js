// Shared by every page: the navigation and the copy buttons.

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
// The wordmark's font can arrive after the first measure, which a fallback font may have widened.
document.fonts.ready.then(() => {
  lastWidth = 0;
  layoutNav();
});

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

/* Links to other sites open in a new tab, so ultracord.dev stays open behind them. Downloads, marked
   `data-download`, stay in place: in a new tab they would leave an empty one behind. */

function openOutside(root) {
  const links = root.matches?.('a[href]') ? [root] : root.querySelectorAll?.('a[href]') ?? [];
  for (const link of links) {
    if (link.origin === location.origin || link.hasAttribute('data-download')) continue;
    link.target = '_blank';
    link.rel = 'noopener';
  }
}

openOutside(document);
new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) openOutside(node);
  }
}).observe(document.body, { childList: true, subtree: true });
