// Dev / preview server.
//   dev:      imported by esbuild.config.mjs --serve  (renders site/ on the fly, serves /lib/ from dist/)
//   preview:  node scripts/serve.mjs --built          (serves the finished _site/ exactly as GitHub Pages would)
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { respond } from './site.mjs';

export function startServer({ port = Number(process.env.PORT) || 8080, built = false } = {}) {
   const server = createServer((req, res) => {
      try {
         const url = new URL(req.url, 'http://x');
         const r = respond(url.pathname, { built });
         if (!r) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found: ' + req.url); }
         if (r.redirect) { res.writeHead(302, { Location: r.redirect + url.search }); return res.end(); }
         res.writeHead(200, { 'Content-Type': r.type, 'Cache-Control': 'no-store' });
         res.end(r.body);
      } catch (e) {
         res.writeHead(500, { 'Content-Type': 'text/plain' });
         res.end(String(e && e.stack || e));
      }
   }).listen(port, () => console.log(`${built ? 'Preview' : 'Dev server'}: http://localhost:${port}/`));
   return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--built')) startServer({ built: true });
