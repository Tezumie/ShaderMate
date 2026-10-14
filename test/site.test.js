import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';

const { buildSite } = await import('../scripts/site.mjs');

function walk(dir, out = []) {
   for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p, out) : out.push(p); }
   return out;
}

test('built site: every internal href/src resolves', async () => {
   const out = mkdtempSync(join(tmpdir(), 'sm-site-'));
   try {
      const info = await buildSite(out);
      assert.ok(info.docs >= 20 && info.examples >= 5);
      const bad = [];
      for (const f of walk(out).filter(f => f.endsWith('.html') && !f.endsWith('404.html'))) {
         const html = readFileSync(f, 'utf8');
         for (const m of html.matchAll(/(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
            const u = m[1];
            if (/^(https?:|mailto:|data:|\/\/)/.test(u)) continue;
            let p = resolve(dirname(f), u);
            if (!p.startsWith(out)) { bad.push(`${f}: ${u} escapes`); continue; }
            if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
            if (!existsSync(p)) bad.push(`${f.replace(out, '')}: ${u}`);
         }
      }
      assert.deepEqual(bad, []);
      for (const f of ['index.html', 'docs/index.html', 'examples/index.html', '404.html', 'sitemap.xml', 'robots.txt', 'assets/og.png']) assert.ok(existsSync(join(out, f)), f);
   } finally { rmSync(out, { recursive: true, force: true }); }
});
