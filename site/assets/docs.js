// Docs pages: copy buttons, "on this page" highlight, and a collapsed menu on phones.
for (const btn of document.querySelectorAll('.code .copy')) {
   btn.addEventListener('click', async () => {
      const code = btn.parentElement.querySelector('code').innerText.replace(/\n$/, '');
      try { await navigator.clipboard.writeText(code); btn.textContent = 'Copied'; } catch { btn.textContent = 'Press Ctrl+C'; }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
   });
}

const menu = document.querySelector('.docs-menu');
if (menu && matchMedia('(max-width: 860px)').matches) menu.open = false;

// Highlight the heading currently under the top of the viewport
const links = [...document.querySelectorAll('.docs-toc a')];
const targets = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
if (targets.length && 'IntersectionObserver' in window) {
   const visible = new Set();
   const io = new IntersectionObserver(entries => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      const current = targets.find(t => visible.has(t)) || [...targets].reverse().find(t => t.getBoundingClientRect().top < 120);
      links.forEach(a => a.classList.toggle('active', !!current && a.hash === '#' + current.id));
   }, { rootMargin: '-80px 0px -65% 0px' });
   targets.forEach(t => io.observe(t));
}
