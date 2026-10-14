// Shared behaviour for every site page: nav state, mobile menu, and the ⌘K / Ctrl K search palette.
const ROOT = new URL('../', import.meta.url).href;

// Platform-correct shortcut label
const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
document.querySelectorAll('[data-kbd]').forEach(k => { k.textContent = mac ? '⌘ K' : 'Ctrl K'; });

// Nav gets a solid background once the page scrolls under it (only matters on overlay pages)
const nav = document.querySelector('[data-nav]');
if (nav) {
   const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 24);
   onScroll();
   addEventListener('scroll', onScroll, { passive: true });
}

// Mobile menu
const menuBtn = document.querySelector('[data-menu]'), menu = document.getElementById('mobile-menu');
if (menuBtn && menu) {
   const set = open => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); if (nav && open) nav.classList.add('is-solid'); else if (nav) nav.classList.toggle('is-solid', scrollY > 24); };
   menuBtn.addEventListener('click', () => set(menu.hidden));
   menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
   addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) set(false); });
}

// Search: load the palette on first use
let palette = null;
async function openSearch() {
   if (!palette) palette = (await import('./search.js')).createPalette(ROOT);
   palette.open();
}
document.addEventListener('click', e => { if (e.target.closest('[data-search]')) { e.preventDefault(); openSearch(); } });
addEventListener('keydown', e => {
   const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
   if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
   else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
});
