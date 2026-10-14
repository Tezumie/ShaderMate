// Static-site generator for ShaderMate's website. No framework: hand-written pages + Markdown docs + a generated gallery.
//
//   site/                 source (HTML pages, assets, docs/*.md, examples/<slug>/…)
//   dist/                 library build, published to <site>/lib/
//   _site/                output of `npm run build:site` (what GitHub Pages serves)
//
// The same functions power the dev server (rendered on the fly) and the build (written to disk).
// Every generated link is relative, so the site works at any base path (localhost, project pages, proxies).

import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join, dirname, extname, relative, posix, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { renderMarkdown, highlightCode } from './markdown.mjs';
import {
   ROOT_DIR as ROOT, pkg, SITE_URL, REPO, esc, absUrl, headTags, announceHtml, navHtml, footerHtml, scriptsHtml, markSvg,
} from './templates.mjs';

export { ROOT };
export const SITE_DIR = join(ROOT, 'site');
export const DIST_DIR = join(ROOT, 'dist');
export const OUT_DIR = join(ROOT, '_site');

// ── examples (gallery) ─────────────────────────────────────────────────────

export function loadExamples() {
   const dir = join(SITE_DIR, 'examples');
   const out = [];
   for (const slug of readdirSync(dir)) {
      const meta = join(dir, slug, 'example.json');
      if (!existsSync(meta)) continue;
      const m = JSON.parse(readFileSync(meta, 'utf8'));
      const thumbFile = join(dir, slug, 'thumb.glsl');
      out.push({ slug, order: 100, ...m, thumb: existsSync(thumbFile) ? readFileSync(thumbFile, 'utf8') : '' });
   }
   return out.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

const exampleHref = (e, prefix) => `${prefix}${e.slug}/`;

const mosaicHtml = (examples, prefix) => examples.map((e, i) => `<a class="tile tile-${i + 1}" href="${exampleHref(e, prefix)}"><canvas data-thumb="${e.slug}" aria-hidden="true"></canvas><span class="tile-tag">${esc(e.tag || 'Example')}</span><span class="tile-text"><h3>${esc(e.title)}</h3><p>${esc(e.description || '')}</p></span></a>`).join('\n');

const galleryHtml = (examples, prefix) => examples.map(e => `<a class="ex-card" href="${exampleHref(e, prefix)}" data-tag="${esc(e.tag || '')}"><span class="ex-thumb"><canvas data-thumb="${e.slug}" aria-hidden="true"></canvas></span><span class="ex-body"><span class="ex-tag">${esc(e.tag || 'Example')}</span><h3>${esc(e.title)}</h3><p>${esc(e.description || '')}</p><code>${esc(e.code || '')}</code></span></a>`).join('\n');

const filtersHtml = examples => {
   const tags = [...new Set(examples.map(e => e.tag).filter(Boolean))];
   return `<button type="button" class="chip is-on" data-filter="">All</button>` + tags.map(t => `<button type="button" class="chip" data-filter="${esc(t)}">${esc(t)}</button>`).join('');
};

const thumbsScript = examples => `<script>window.__thumbs = ${JSON.stringify(Object.fromEntries(examples.filter(e => e.thumb).map(e => [e.slug, e.thumb]))).replace(/</g, '\\u003c')};</script>`;

let _gz = null;
export function coreSize() {
   const f = join(DIST_DIR, 'shadermate.min.js');
   if (!existsSync(f)) return '—';
   if (_gz === null || _gz.mtime !== statSync(f).mtimeMs) _gz = { mtime: statSync(f).mtimeMs, kb: (gzipSync(readFileSync(f)).length / 1024) };
   return Math.round(_gz.kb) + ' KB';
}

/**
 * Replace the generator markers in a hand-written HTML page.
 *   root     relative path back to the site root ('../../')
 *   relPath  the page's path inside the site ('examples/hero/index.html'), used for canonical URLs and example metadata
 */
export function transformHtml(html, root, relPath = 'index.html') {
   const examples = loadExamples();
   const title = (/<title>([\s\S]*?)<\/title>/.exec(html) || [])[1] || 'ShaderMate';
   const description = (/<meta name="description" content="([^"]*)"/.exec(html) || [])[1];
   const slug = (/^examples\/([^/]+)\//.exec(relPath) || [])[1];
   const current = examples.find(e => e.slug === slug);

   return html
      .replace(/<code data-hl="(\w+)">([\s\S]*?)<\/code>/g, (_, lang, code) => `<code class="hljs language-${lang}">${highlightCode(code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), lang)}</code>`)
      .replace(/<!--HEAD([^>]*)-->/g, (_, a) => headTags({ root, title: title.replace(/&amp;/g, '&'), description, path: relPath, css: ((/css=([\w,-]+)/.exec(a) || [])[1] || '').split(',').filter(Boolean), noindex: /noindex/.test(a) }))
      .replace(/<!--BASE-->/g, '')
      .replace(/<!--ANNOUNCE-->/g, announceHtml(root))
      .replace(/<!--NAV([^>]*)-->/g, (_, a) => navHtml(root, { current: (/current=(\w+)/.exec(a) || [])[1] || '', overlay: /overlay/.test(a) }))
      .replace(/<!--FOOTER-->/g, footerHtml(root))
      .replace(/<!--SCRIPTS-->/g, scriptsHtml(root))
      .replace(/<!--BACK-->/g, () => backPill(root, current, slug))
      .replace(/<!--MOSAIC-->/g, mosaicHtml(examples, root + 'examples/'))
      .replace(/<!--GALLERY-->/g, galleryHtml(examples, ''))
      .replace(/<!--FILTERS-->/g, filtersHtml(examples))
      .replace(/<!--COUNT-->/g, String(examples.length))
      .replace(/<!--THUMBS-->/g, thumbsScript(examples))
      .replace(/\{\{version\}\}/g, pkg.version)
      .replace(/\{\{size\}\}/g, coreSize());
}

/** Top-left breadcrumb pill + source link on full-screen example pages. */
function backPill(root, ex, slug) {
   const src = slug ? `${REPO}/tree/main/site/examples/${slug}` : REPO;
   return `<div class="pill-bar"><a class="pill" href="${root}examples/">${markSvg}<span>Examples</span></a>${ex ? `<span class="pill pill-static">${esc(ex.title)}</span>` : ''}<span class="pill-spacer"></span><a class="pill" href="${root}docs/">Docs</a><a class="pill" href="${src}">View source</a></div>`;
}

// ── docs ───────────────────────────────────────────────────────────────────

function parseFront(text) {
   const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
   const meta = {};
   if (m) for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
   return { meta, body: m ? text.slice(m[0].length) : text };
}


/** Make every relative page link explicit (`docs/` → `docs/index.html`) so navigation never depends on a server's
 *  directory-index or trailing-slash handling (path-prefixing proxies, static hosts, previews). */
export function explicitLinks(html) {
   return html.replace(/(<a\b[^>]*?\shref=")([^"]*)"/g, (m, a, v) => {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(v)) return m;
      const i = v.search(/[#?]/), path = i < 0 ? v : v.slice(0, i), rest = i < 0 ? '' : v.slice(i);
      if (path === '') return m;
      if (path === '.' || path === '..') return a + path + '/index.html' + rest + '"';
      return path.endsWith('/') ? a + path + 'index.html' + rest + '"' : m;
   });
}

export function loadDocs() {
   const dir = join(SITE_DIR, 'docs');
   const docs = readdirSync(dir).filter(f => f.endsWith('.md')).map(file => {
      const { meta, body } = parseFront(readFileSync(join(dir, file), 'utf8'));
      const name = file.replace(/\.md$/, '');
      return { file, slug: name === 'index' ? '' : name, title: meta.title || name, group: meta.group || 'Docs', order: Number(meta.order) || 100, description: meta.description || '', body };
   }).sort((a, b) => a.order - b.order);
   for (const d of docs) Object.assign(d, renderMarkdown(d.body, { isIndex: !d.slug }));
   return docs;
}

const wordCount = html => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

export function docPageHtml(doc, docs) {
   const root = doc.slug ? '../../' : '../';
   const link = d => root + 'docs/' + (d.slug ? d.slug + '/' : '');
   const groups = [...new Set(docs.map(d => d.group))];
   const side = groups.map(g => `<div class="docs-group"><h2>${esc(g)}</h2><ul>${docs.filter(d => d.group === g).map(d => `<li><a href="${link(d)}"${d === doc ? ' aria-current="page"' : ''}>${esc(d.title)}</a></li>`).join('')}</ul></div>`).join('');
   const i = docs.indexOf(doc), prev = docs[i - 1], next = docs[i + 1];
   const tocHtml = doc.toc.length > 1 ? `<aside class="docs-toc" aria-label="On this page"><h2>On this page</h2><ul>${doc.toc.map(t => `<li class="d${t.depth}"><a href="#${t.id}">${t.text}</a></li>`).join('')}</ul></aside>` : '<aside class="docs-toc"></aside>';
   const mins = Math.max(1, Math.round(wordCount(doc.html) / 220));
   const title = doc.slug ? `${doc.title} · ShaderMate docs` : 'ShaderMate documentation';
   const path = 'docs/' + (doc.slug ? doc.slug + '/' : '');
   return `<!DOCTYPE html>
<html lang="en"><head>
<title>${esc(title)}</title>
<meta name="description" content="${esc(doc.description)}">
${headTags({ root, title, description: doc.description, path, css: ['docs'] })}
</head>
<body class="page-docs">
<a class="skip" href="#content">Skip to content</a>
${navHtml(root, { current: 'Docs' })}
<div class="docs-layout">
<aside class="docs-side" aria-label="Documentation"><button class="docs-find" type="button" data-search><span>Search docs</span><kbd data-kbd>Ctrl K</kbd></button><details class="docs-menu" open><summary>Menu</summary>${side}</details></aside>
<main class="prose" id="content">
<nav class="crumbs" aria-label="Breadcrumb"><a href="${root}docs/">Docs</a><span aria-hidden="true">/</span><span>${esc(doc.group)}</span></nav>
<h1>${esc(doc.title)}</h1>
${doc.description ? `<p class="lead">${esc(doc.description)}</p>` : ''}
<p class="meta">${mins} min read</p>
${doc.html}
<div class="docs-foot">
<a class="edit" href="${REPO}/edit/main/site/docs/${doc.file}">Edit this page on GitHub</a>
<div class="pager">${prev ? `<a class="prev" href="${link(prev)}"><small>Previous</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}${next ? `<a class="next" href="${link(next)}"><small>Next</small><span>${esc(next.title)}</span></a>` : '<span></span>'}</div>
</div>
</main>
${tocHtml}
</div>
${footerHtml(root)}
${scriptsHtml(root)}
<script type="module" src="${root}assets/docs.js"></script>
</body></html>
`;
}

// ── search index, sitemap ──────────────────────────────────────────────────

export function searchIndex() {
   const docs = loadDocs(), items = [];
   for (const d of docs) {
      const base = 'docs/' + (d.slug ? d.slug + '/' : '');
      items.push({ t: d.title, g: d.group, u: base, x: d.description });
      for (const s of d.sections) if (s.heading) items.push({ t: s.heading, g: d.title, u: base + '#' + s.id, x: s.text });
   }
   for (const e of loadExamples()) items.push({ t: e.title, g: 'Example', u: `examples/${e.slug}/`, x: e.description || '' });
   return items;
}

export function sitemapXml() {
   const urls = ['', 'docs/', 'examples/', ...loadDocs().filter(d => d.slug).map(d => `docs/${d.slug}/`), ...loadExamples().map(e => `examples/${e.slug}/`)];
   return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map(u => `  <url><loc>${absUrl(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
}
export const robotsTxt = () => `User-agent: *\nAllow: /\nSitemap: ${absUrl('sitemap.xml')}\n`;

// ── serving (dev) ──────────────────────────────────────────────────────────

const MIME = {
   '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript', '.css': 'text/css',
   '.glsl': 'text/plain', '.frag': 'text/plain', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml',
   '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.txt': 'text/plain',
   '.woff2': 'font/woff2',
};
export const mimeFor = f => MIME[extname(f)] || 'application/octet-stream';

const isDir = p => existsSync(p) && statSync(p).isDirectory();
const relRoot = pagePath => '../'.repeat(Math.max(0, pagePath.split('/').filter(Boolean).length - (pagePath.endsWith('/') ? 0 : 1))) || './';

/**
 * Resolve a URL path to a response description: { redirect } | { type, body } | null.
 * `built` serves the finished _site/ directory instead of rendering from source.
 */
export function respond(urlPath, { built = false } = {}) {
   // Trailing slash is read from the raw URL: some runtimes (Nodepod) drop it from path.normalize()/join().
   const hadSlash = urlPath.endsWith('/');
   let p = posix.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.\/)+/, '');
   if (hadSlash && !p.endsWith('/')) p += '/';
   const base = built ? OUT_DIR : SITE_DIR;

   if (!built) {
      if (p.startsWith('/lib/')) {
         const f = join(DIST_DIR, p.slice(5));
         return existsSync(f) && !isDir(f) ? { type: mimeFor(f), body: readFileSync(f) } : null;
      }
      if (p === '/search-index.json') return { type: MIME['.json'], body: JSON.stringify(searchIndex()) };
      if (p === '/sitemap.xml') return { type: MIME['.xml'], body: sitemapXml() };
      if (p === '/robots.txt') return { type: MIME['.txt'], body: robotsTxt() };
      if (p === '/docs' || p.startsWith('/docs/')) {
         if (p === '/docs') return { redirect: 'docs/' };
         if (p.endsWith('/index.html')) p = p.slice(0, -'index.html'.length);
         const slug = p.replace(/^\/docs\//, '').replace(/\/$/, '');
         if (!p.endsWith('/') && !slug.includes('.')) return { redirect: slug.split('/').pop() + '/' };
         const docs = loadDocs();
         const doc = docs.find(d => d.slug === slug);
         if (doc) return { type: MIME['.html'], body: explicitLinks(docPageHtml(doc, docs)) };
      }
   }

   let file = join(base, p);
   if (isDir(file)) {
      if (!p.endsWith('/')) return { redirect: p.split('/').pop() + '/' };   // relative Location: right behind path-prefixing proxies
      file = join(file, 'index.html');
   }
   if (!existsSync(file)) return null;
   if (!built && extname(file) === '.html') return { type: MIME['.html'], body: explicitLinks(transformHtml(readFileSync(file, 'utf8'), relRoot('/' + relative(SITE_DIR, file).split(sep).join('/')), relative(SITE_DIR, file).split(sep).join('/'))) };
   return { type: mimeFor(file), body: readFileSync(file) };
}

// ── build ──────────────────────────────────────────────────────────────────

export function buildSite(out = OUT_DIR) {
   rmSync(out, { recursive: true, force: true });
   mkdirSync(out, { recursive: true });
   let pages = 0;

   const walk = (dir, rel = '') => {
      for (const name of readdirSync(dir)) {
         const src = join(dir, name), r = rel ? rel + '/' + name : name;
         if (isDir(src)) { walk(src, r); continue; }
         if (r.startsWith('docs/') && name.endsWith('.md')) continue;        // rendered below
         if (name === 'thumb.glsl' || name === 'example.json') continue;      // consumed by the gallery
         if (name === 'README.md') continue;
         const dst = join(out, ...r.split('/'));
         mkdirSync(dirname(dst), { recursive: true });
         if (name.endsWith('.html')) {
            const depth = r.split('/').length - 1;
            let html = transformHtml(readFileSync(src, 'utf8'), '../'.repeat(depth) || './', r);
            if (r === '404.html') html = html.replace('<head>', `<head>\n<base href="${new URL(SITE_URL).pathname}">`);   // 404 is served from any depth
            writeFileSync(dst, explicitLinks(html)); pages++;
         } else cpSync(src, dst);
      }
   };
   walk(SITE_DIR);

   const docs = loadDocs();
   for (const d of docs) {
      const dst = join(out, 'docs', ...(d.slug ? [d.slug] : []), 'index.html');
      mkdirSync(dirname(dst), { recursive: true });
      writeFileSync(dst, explicitLinks(docPageHtml(d, docs))); pages++;
   }

   writeFileSync(join(out, 'search-index.json'), JSON.stringify(searchIndex()));
   writeFileSync(join(out, 'sitemap.xml'), sitemapXml());
   writeFileSync(join(out, 'robots.txt'), robotsTxt());

   if (!existsSync(DIST_DIR)) throw new Error('dist/ is missing: run `npm run build` first');
   cpSync(DIST_DIR, join(out, 'lib'), { recursive: true });
   writeFileSync(join(out, '.nojekyll'), '');
   return { pages, docs: docs.length, examples: loadExamples().length, out: relative(ROOT, out).split(sep).join('/') };
}
