const pageUrl = u => (u.endsWith('/') || u === '' ? u + 'index.html' : u);
// Command-palette search over docs headings, pages and examples. The index (search-index.json) is built
// with the site and fetched the first time the palette opens.

const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function score(item, words) {
   const t = item._t, g = item._g, x = item._x;
   let total = 0;
   for (const w of words) {
      let s = 0;
      if (t === w) s += 14;
      else if (t.startsWith(w)) s += 10;
      else if (t.includes(' ' + w)) s += 8;
      else if (t.includes(w)) s += 6;
      if (g.includes(w)) s += 2;
      if (x.includes(w)) s += 1;
      if (!s) return 0;           // every word has to match somewhere
      total += s;
   }
   return total;
}

function mark(text, words) {
   let out = esc(text);
   for (const w of words) {
      if (!w) continue;
      out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
   }
   return out;
}

export function createPalette(root) {
   let items = null, sel = 0, results = [], returnFocus = null;

   const el = document.createElement('div');
   el.className = 'palette'; el.hidden = true;
   el.innerHTML = `<div class="palette-box" role="dialog" aria-modal="true" aria-label="Search">
      <div class="palette-input">
         <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/></svg>
         <input type="text" placeholder="Search docs and examples" aria-label="Search" autocomplete="off" spellcheck="false">
         <kbd>Esc</kbd>
      </div>
      <div class="palette-list" role="listbox"></div>
      <div class="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span></div>
   </div>`;
   document.body.append(el);
   const input = el.querySelector('input'), list = el.querySelector('.palette-list');

   async function load() {
      if (items) return;
      try {
         const r = await fetch(root + 'search-index.json');
         items = (await r.json()).map(i => ({ ...i, _t: norm(i.t), _g: norm(i.g || ''), _x: norm(i.x || '') }));
      } catch { items = []; }
   }

   function render() {
      const q = norm(input.value).trim(), words = q.split(/\s+/).filter(Boolean);
      if (!words.length) {
         // empty query: the main pages
         results = (items || []).filter(i => !i.u.includes('#') && i.g !== 'Example').slice(0, 8);
      } else {
         results = (items || []).map(i => [score(i, words), i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 9).map(([, i]) => i);
      }
      sel = 0;
      if (!results.length) { list.innerHTML = `<div class="palette-empty">No results for "${esc(input.value)}".</div>`; return; }
      let last = null, html = '';
      results.forEach((r, n) => {
         const group = words.length ? '' : r.g;
         if (group !== last && group) { html += `<div class="palette-group">${esc(group)}</div>`; }
         last = group;
         const parent = r.u.includes('#') ? `<span class="p">${esc(r.g)}</span>` : (r.g === 'Example' ? '<span class="p">Example</span>' : '');
         html += `<a class="palette-item" role="option" id="pi-${n}" href="${pageUrl(root + r.u)}" data-n="${n}" aria-selected="${n === 0}"><span class="t">${mark(r.t, words)}${parent}</span>${r.x ? `<span class="x">${mark(r.x, words)}</span>` : ''}</a>`;
      });
      list.innerHTML = html;
   }

   function move(d) {
      if (!results.length) return;
      sel = (sel + d + results.length) % results.length;
      list.querySelectorAll('.palette-item').forEach((a, n) => a.setAttribute('aria-selected', String(n === sel)));
      list.querySelector(`#pi-${sel}`)?.scrollIntoView({ block: 'nearest' });
   }

   function close() {
      el.hidden = true; document.documentElement.style.overflow = '';
      if (returnFocus && returnFocus.focus) returnFocus.focus();
   }

   input.addEventListener('input', render);
   input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { const r = results[sel]; if (r) location.href = pageUrl(root + r.u); }
   });
   el.addEventListener('mousedown', e => { if (e.target === el) close(); });
   list.addEventListener('mousemove', e => { const a = e.target.closest('.palette-item'); if (a && +a.dataset.n !== sel) { sel = +a.dataset.n; list.querySelectorAll('.palette-item').forEach((x, n) => x.setAttribute('aria-selected', String(n === sel))); } });
   addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) { e.preventDefault(); close(); } });

   return {
      async open() {
         returnFocus = document.activeElement;
         el.hidden = false; document.documentElement.style.overflow = 'hidden';
         input.value = ''; input.focus();
         await load(); render();
      },
      close,
   };
}
