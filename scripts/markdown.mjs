// Markdown → HTML for the docs: highlighted code with optional titles, callouts, heading anchors, table wrapping.
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import glsl from 'highlight.js/lib/languages/glsl';
import md from 'highlight.js/lib/languages/markdown';
import { esc } from './templates.mjs';

hljs.registerLanguage('javascript', js); hljs.registerLanguage('typescript', ts); hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css); hljs.registerLanguage('bash', bash); hljs.registerLanguage('json', json);
hljs.registerLanguage('glsl', glsl); hljs.registerLanguage('markdown', md);
hljs.registerAliases(['js', 'jsx', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'vue'], { languageName: 'xml' });
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['md'], { languageName: 'markdown' });
hljs.registerAliases(['frag', 'vert'], { languageName: 'glsl' });

export const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
const stripTags = h => h.replace(/<[^>]+>/g, '');
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export const highlightCode = (code, lang) => (lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : esc(code));

const LABEL = { note: 'Note', tip: 'Tip', warning: 'Warning', important: 'Important' };

/** `> [!NOTE]` blocks → <div class="callout callout-note"> (the inner text is still Markdown). */
function expandCallouts(src) {
   return src.replace(/^> \[!(NOTE|TIP|WARNING|IMPORTANT)\][ \t]*\n((?:>.*(?:\n|$))*)/gim, (_, type, rest) => {
      const t = type.toLowerCase();
      const inner = rest.split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
      return `<div class="callout callout-${t}">\n<p class="callout-title">${LABEL[t]}</p>\n\n${inner}\n\n</div>\n\n`;
   });
}

export function renderMarkdown(body, { isIndex = false } = {}) {
   const toc = [];
   let firstH1 = null;
   const m = new Marked({
      renderer: {
         heading({ tokens, depth }) {
            const text = this.parser.parseInline(tokens);
            if (depth === 1) { if (firstH1 === null) firstH1 = stripTags(text); return ''; }   // the page header comes from front matter
            const id = slugify(text);
            if (depth === 2 || depth === 3) toc.push({ depth, id, text: stripTags(text) });
            return `<h${depth} id="${id}">${text}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`;
         },
         code({ text, lang }) {
            const info = (lang || '').trim();
            const l = info.split(/\s+/)[0];
            const title = (/title="([^"]*)"/.exec(info) || [])[1];
            const noCopy = /\bnocopy\b/.test(info);
            const html = l && hljs.getLanguage(l) ? hljs.highlight(text, { language: l }).value : esc(text);
            const label = title || ({ javascript: 'JavaScript', js: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', typescript: 'TypeScript', html: 'HTML', glsl: 'GLSL', bash: 'Terminal', sh: 'Terminal', json: 'JSON', css: 'CSS', md: 'Markdown' }[l] || '');
            return `<figure class="code${label ? '' : ' code-bare'}">${label ? `<figcaption>${esc(label)}</figcaption>` : ''}<pre><code class="hljs${l ? ' language-' + l : ''}">${html}</code></pre>${noCopy ? '' : '<button class="copy" type="button" aria-label="Copy code">Copy</button>'}</figure>\n`;
         },
      },
   });
   let html = m.parse(expandCallouts(body));
   html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
   // Links are authored as if every page lived at docs/<slug>/. The docs index lives at docs/.
   if (isIndex) html = html.replace(/href="\.\.\//g, 'href="');

   // Search sections: the intro and each h2/h3 with the text that follows it.
   const sections = [];
   const first = html.search(/<h[23] id=/);
   const intro = stripTags(first < 0 ? html : html.slice(0, first)).replace(/\s+/g, ' ').trim();
   if (intro) sections.push({ id: '', heading: '', text: decode(intro).slice(0, 240) });
   const re = /<h([23]) id="([^"]+)">([\s\S]*?)<a class="anchor"[\s\S]*?<\/h\1>([\s\S]*?)(?=<h[23] id=|$)/g;
   let s;
   while ((s = re.exec(html))) sections.push({ id: s[2], heading: decode(stripTags(s[3])), text: decode(stripTags(s[4]).replace(/\s+/g, ' ').trim()).slice(0, 240) });

   return { html, toc, sections, h1: firstH1 };
}
