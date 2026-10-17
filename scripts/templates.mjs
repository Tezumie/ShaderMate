// Shared page chrome for the website: <head> tags, nav, announcement bar, footer.
// Every link is relative to `root` (the path back to the site root), so the site works under any base path.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
export const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8'));

/** Absolute URL the site is published at (used for canonical links, Open Graph and the sitemap). */
export const SITE_URL = (process.env.SITE_URL || 'https://tezumie.github.io/ShaderMate/').replace(/\/?$/, '/');
export const REPO = 'https://github.com/Tezumie/ShaderMate';
export const NPM = 'https://www.npmjs.com/package/shadermate';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The brand mark: a rounded square filled with a slowly hue-shifting conic gradient (styled in site.css).
const MARK = `<span class="mark" aria-hidden="true"></span>`;
export const markSvg = MARK;

const ICON_SEARCH = `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/></svg>`;
const ICON_GITHUB = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>`;
const ICON_MENU = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14"/></svg>`;

export const NAV_LINKS = (root) => [
   ['Docs', root + 'docs/'],
   ['Examples', root + 'examples/'],
   ['Playground', root + 'examples/livecode/'],
   ['Recipes', root + 'docs/recipes/'],
   ['Changelog', root + 'docs/changelog/'],
];

/** Absolute URL for a site-relative path ('docs/options/' → https://…/docs/options/). */
export const absUrl = rel => new URL(rel.replace(/(^|\/)index\.html$/, '$1'), SITE_URL).href;

export function headTags({ root, title, description, path = '', css = [], noindex = false }) {
   const desc = description || pkg.description;
   const url = absUrl(path);
   return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#05050a">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${root}assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="ShaderMate">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${absUrl('assets/og.png')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${root}assets/site.css">${css.map(c => `\n<link rel="stylesheet" href="${root}assets/${c}.css">`).join('')}`;
}

export function announceHtml(root) {
   return `<a class="announce" href="${root}docs/changelog/"><span class="announce-dot" aria-hidden="true"></span><span><strong>v${pkg.version} is out</strong> · free &amp; MIT open source. Read the release notes →</span></a>`;
}

export function navHtml(root, { current = '', overlay = false } = {}) {
   const links = NAV_LINKS(root);
   return `<header class="nav${overlay ? ' nav-overlay' : ''}" data-nav>
<div class="nav-inner">
<a class="brand" href="${root}" aria-label="ShaderMate home">${MARK}<span>ShaderMate</span><span class="brand-ver">${pkg.version.replace(/\.\d+$/, '')}</span></a>
<nav class="nav-links" aria-label="Primary">${links.map(([l, h]) => `<a href="${h}"${l === current ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
<div class="nav-right">
<button class="search-btn" type="button" data-search aria-label="Search the docs">${ICON_SEARCH}<span class="search-label">Search docs</span><kbd data-kbd>Ctrl K</kbd></button>
<a class="ver" href="${root}docs/changelog/" title="Release notes">v${pkg.version}</a>
<a class="npm-btn" href="${NPM}" aria-label="ShaderMate on npm"><i aria-hidden="true"></i>npm</a>
<a class="nav-gh" href="${REPO}" aria-label="Star ShaderMate on GitHub">${ICON_GITHUB}<span>Star</span></a>
<button class="icon-btn menu-btn" type="button" data-menu aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu">${ICON_MENU}</button>
</div>
</div>
<nav class="mobile-menu" id="mobile-menu" aria-label="Mobile" hidden>
${links.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}
<a href="${REPO}">GitHub</a><a href="${NPM}">npm</a>
</nav>
</header>`;
}

export function footerHtml(root) {
   const col = (title, items) => `<div class="footer-col"><h2>${title}</h2><ul>${items.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>`;
   return `<footer class="footer">
<div class="footer-cta">
<h2>Ship pixels,<br><span class="grad">not boilerplate.</span></h2>
<div class="row"><a class="btn btn-primary btn-lg" href="${root}docs/getting-started/">Get started</a><a class="btn btn-lg" href="${REPO}">★ Star on GitHub</a></div>
</div>
<div class="footer-inner">
<div class="footer-brand">
<a class="brand" href="${root}">${MARK}<span>ShaderMate</span></a>
<p>GPU magic in a few lines of JavaScript. Fragment shaders for any canvas on the web.</p>
<p class="footer-note">Every shader on this site is rendered by ShaderMate.</p>
</div>
${col('Learn', [['Quick start', root + 'docs/getting-started/'], ['Writing shaders', root + 'docs/writing-shaders/'], ['Uniforms', root + 'docs/uniforms/'], ['Multipass', root + 'docs/multipass/'], ['Recipes', root + 'docs/recipes/']])}
${col('Reference', [['Options', root + 'docs/options/'], ['Instance API', root + 'docs/instance-api/'], ['Built-in uniforms', root + 'docs/builtin-uniforms/'], ['Events', root + 'docs/events/'], ['TypeScript', root + 'docs/typescript/']])}
${col('Explore', [['Examples', root + 'examples/'], ['Playground', root + 'examples/livecode/'], ['Changelog', root + 'docs/changelog/'], ['Migrating from 1.x', root + 'docs/migrating/']])}
${col('Project', [['GitHub', REPO], ['npm', NPM], ['Issues', REPO + '/issues'], ['Releases', REPO + '/releases'], ['Contributing', root + 'docs/contributing/']])}
</div>
<div class="footer-bottom"><span>&copy; ${new Date().getFullYear()} Tezumie · MIT licensed · v${pkg.version}</span><span>Made with <a href="https://codevre.com">Codevre</a>.</span></div>
</footer>`;
}

export const scriptsHtml = root => `<script type="module" src="${root}assets/site.js"></script>`;
