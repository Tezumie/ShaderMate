// esbuild build script for ShaderMate.
//
//   node esbuild.config.mjs            one-off build -> dist/
//   node esbuild.config.mjs --watch    rebuild on change
//   node esbuild.config.mjs --serve    watch + dev server for the website (http://localhost:8080/)
//
// dist/
//   shadermate.js, shadermate.min.js        <script> build  -> window.ShaderMate.createShader(...)
//   shadermate.esm.js, shadermate.esm.min.js ES module      -> import { createShader } from 'shadermate'
//   shadermate.cjs                           CommonJS
//   gui.esm.js                               'shadermate/gui'   (lil-gui is a peer dependency)
//   shadermate-gui.js, shadermate-gui.min.js <script> GUI addon (lil-gui bundled) -> ShaderMate.createGui()
//   react.esm.js                             'shadermate/react' (react is a peer dependency)

import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const args = new Set(process.argv.slice(2));
const watch = args.has('--watch') || args.has('--serve');
const serve = args.has('--serve');

const banner = `/*! ShaderMate v${pkg.version} | MIT | (c) 2025 Tezumie | https://github.com/Tezumie/ShaderMate */`;
const guiBanner = `${banner}\n/*! bundles lil-gui (MIT) https://github.com/georgealways/lil-gui */`;

/** In the addon ESM builds, `../index.js` must resolve to the published core, not a second copy. */
const coreExternal = {
   name: 'core-external',
   setup(b) {
      b.onResolve({ filter: /^\.\.\/index\.js$/ }, () => ({ path: './shadermate.esm.js', external: true }));
   }
};

const common = {
   bundle: true,
   target: ['es2019'],
   banner: { js: banner },
   legalComments: 'none',
   define: { __VERSION__: JSON.stringify(pkg.version) },
   logLevel: 'info',
   sourcemap: true,
};

const configs = [
   // core
   // The IIFE global is the module namespace itself: ShaderMate.createShader(...) === import { createShader }
   { ...common, entryPoints: ['src/index.js'], outfile: 'dist/shadermate.js', format: 'iife', globalName: 'ShaderMate' },
   { ...common, entryPoints: ['src/index.js'], outfile: 'dist/shadermate.min.js', format: 'iife', globalName: 'ShaderMate', minify: true },
   { ...common, entryPoints: ['src/index.js'], outfile: 'dist/shadermate.esm.js', format: 'esm' },
   { ...common, entryPoints: ['src/index.js'], outfile: 'dist/shadermate.esm.min.js', format: 'esm', minify: true },
   { ...common, entryPoints: ['src/index.js'], outfile: 'dist/shadermate.cjs', format: 'cjs' },
   // gui addon
   { ...common, entryPoints: ['src/gui/index.js'], outfile: 'dist/gui.esm.js', format: 'esm', external: ['lil-gui'], plugins: [coreExternal] },
   { ...common, entryPoints: ['src/gui/browser.js'], outfile: 'dist/shadermate-gui.js', format: 'iife', banner: { js: guiBanner } },
   { ...common, entryPoints: ['src/gui/browser.js'], outfile: 'dist/shadermate-gui.min.js', format: 'iife', minify: true, banner: { js: guiBanner } },
   // react addon
   { ...common, entryPoints: ['src/react/index.js'], outfile: 'dist/react.esm.js', format: 'esm', external: ['react'], plugins: [coreExternal] },
];

if (!watch) {
   await Promise.all(configs.map(c => build(c)));
   console.log(`ShaderMate v${pkg.version} built -> dist/`);
} else {
   const ctxs = await Promise.all(configs.map(c => context(c)));
   await Promise.all(ctxs.map(c => c.rebuild()));
   await Promise.all(ctxs.map(c => c.watch()));
   console.log('Watching src/ ...');

   if (serve) {
      const { startServer } = await import('./scripts/serve.mjs');
      startServer();
   }
}
