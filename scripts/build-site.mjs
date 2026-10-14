// node scripts/build-site.mjs  ->  _site/   (run `npm run build` first; `npm run build:site` does both)
import { buildSite } from './site.mjs';
const r = buildSite();
console.log(`Site built -> ${r.out}/  (${r.pages} pages, ${r.docs} docs, ${r.examples} examples)`);
