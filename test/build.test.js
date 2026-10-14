// Smoke-tests the *built* files in dist/ (`npm test` builds first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const dist = f => new URL(`../dist/${f}`, import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('all expected artifacts exist', () => {
   for (const f of ['shadermate.js', 'shadermate.min.js', 'shadermate.esm.js', 'shadermate.esm.min.js', 'shadermate.cjs',
      'gui.esm.js', 'shadermate-gui.js', 'shadermate-gui.min.js', 'react.esm.js']) {
      assert.ok(existsSync(dist(f)), f);
   }
});

for (const f of ['shadermate.js', 'shadermate.min.js']) {
   test(`${f} (IIFE) defines the globals without touching the DOM`, () => {
      const sandbox = { console };
      vm.createContext(sandbox);
      // The script's completion value is read back instead of sandbox.ShaderMate, so this also
      // passes on runtimes whose vm doesn't copy top-level `var`s onto the context (e.g. Nodepod).
      const ShaderMate = vm.runInContext(readFileSync(dist(f), 'utf8') + '\n;ShaderMate', sandbox);
      // The global is the module namespace: same names as `import { … } from 'shadermate'`.
      assert.equal(typeof ShaderMate.createShader, 'function');
      assert.equal(typeof ShaderMate.glsl, 'function');
      assert.equal(ShaderMate.VERSION, pkg.version);
      assert.equal(ShaderMate.create, undefined);          // no aliases
      assert.equal(ShaderMate.default, undefined);
      assert.equal(sandbox.createShader, undefined);           // no loose globals
      assert.throws(() => ShaderMate.createShader({ shader: 'x' }), /browser/);  // no window -> clear error
   });
}

test('ESM build exports', async () => {
   const m = await import(dist('shadermate.esm.js'));
   assert.equal(typeof m.createShader, 'function');
   assert.equal(m.default, undefined);                            // named exports only
   assert.equal(m.create, undefined);
   assert.equal(m.startShaderMate, undefined);
   assert.equal(m.VERSION, pkg.version);
   assert.equal(m.glsl`a${1}b`, 'a1b');
   assert.deepEqual(m.resolveUniformType('vec3'), m.resolveUniformType('3f'));
   assert.ok(m.BUILTIN_UNIFORMS.iTime);
});

test('CJS build exports', () => {
   const require = createRequire(import.meta.url);
   const m = require('../dist/shadermate.cjs');
   assert.equal(typeof m.createShader, 'function');
   assert.equal(m.VERSION, pkg.version);
});

test('addon builds keep peers and the core external', () => {
   const gui = readFileSync(dist('gui.esm.js'), 'utf8');
   const react = readFileSync(dist('react.esm.js'), 'utf8');
   assert.match(gui, /from "lil-gui"/);
   assert.doesNotMatch(gui, /class GUI/);                   // not bundled
   assert.match(react, /from "react"/);
   assert.match(react, /from "\.\/shadermate\.esm\.js"/);
   assert.doesNotMatch(react, /createContext\(canvas/);     // core not duplicated
   const guiIife = readFileSync(dist('shadermate-gui.js'), 'utf8');
   assert.match(guiIife, /lil-gui/);
   assert.match(guiIife, /ns\.createGui = createGui/);
});

test('package exports map matches files', () => {
   for (const key of ['.', './gui', './react']) {
      const e = pkg.exports[key];
      assert.ok(existsSync(new URL('../' + e.import, import.meta.url)), e.import);
      assert.ok(existsSync(new URL('../' + e.types, import.meta.url)), e.types);
   }
});
