import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleFragment, resolveIncludes, defineLines, DEFAULT_INJECT, NO_INJECT } from '../src/glsl/preprocess.js';
import { declareBuiltins } from '../src/glsl/builtins.js';

const quiet = () => { };
const ST = 'void mainImage(out vec4 c, in vec2 p){ c = vec4(iTime, iResolution.x, 0.0, 1.0); }';

test('GL2: version first, builtins declared, mainImage wrapped, #line mapping present', () => {
   const out = assembleFragment(ST, { isGL2: true });
   assert.ok(out.startsWith('#version 300 es\n'));
   assert.match(out, /out vec4 outColor;/);
   assert.match(out, /uniform float iTime;/);
   assert.match(out, /uniform vec3 iResolution;/);
   assert.doesNotMatch(out, /uniform vec4 iMouse/);        // unused -> not declared
   assert.match(out, /#line 1\nvoid mainImage/);
   assert.match(out, /outColor = c;/);
});

test('GL1: no version, #extension precedes precision, texture() macro, gl_FragColor wrapper', () => {
   const out = assembleFragment(ST, { isGL2: false, enableDerivatives: true });
   assert.ok(!out.includes('#version'));
   assert.ok(out.indexOf('#extension') < out.indexOf('precision'));
   assert.match(out, /#define texture\(s,u\)\s+texture2D\(s,u\)/);
   assert.match(out, /gl_FragColor = c;/);
});

test('user-declared built-ins are not re-declared; cube channels get samplerCube', () => {
   const src = 'uniform highp float iTime; uniform vec2 iResolution;\nvoid main(){ outColor = texture(iChannel0, vec3(1)) + texture(iChannel1, vec2(0)); }';
   const decl = declareBuiltins(src, ['cube', '2D']);
   assert.doesNotMatch(decl, /iTime/);
   assert.doesNotMatch(decl, /iResolution/);
   assert.match(decl, /uniform samplerCube iChannel0;/);
   assert.match(decl, /uniform sampler2D iChannel1;/);
   assert.match(declareBuiltins('float a = iChannelTime[2] + u_mouseUV.x;'), /uniform float iChannelTime\[4\];\nuniform vec2 u_mouseUV;/);
});

test('names inside comments do not trigger declarations', () => {
   assert.equal(declareBuiltins('// iTime iMouse\n/* iResolution */ void main(){}'), '');
});

test('does not wrap when user defines main(), even with mainImage( in a comment', () => {
   const out = assembleFragment('// mainImage( is cool\nvoid main(){ outColor = vec4(1.0); }', { isGL2: true });
   assert.equal((out.match(/void main\s*\(/g) || []).length, 1);
});

test('user #version is hoisted to line 1', () => {
   const out = assembleFragment('\n#version 300 es\nvoid main(){}', { isGL2: true });
   assert.ok(out.startsWith('#version 300 es\n'));
   assert.equal((out.match(/#version/g) || []).length, 1);
});

test('all injection off returns source untouched; DEFAULT_INJECT has every switch on', () => {
   const src = 'void main(){}';
   assert.equal(assembleFragment(src, { isGL2: true, inject: NO_INJECT }), src);
   assert.ok(Object.values(DEFAULT_INJECT).every(Boolean));
});

test('defines: strings, objects, true/value', () => {
   assert.equal(defineLines(['A', { B: 2, C: true }]), '#define A\n#define B 2\n#define C\n');
   assert.match(assembleFragment('void main(){}', { isGL2: true, defines: [{ N: 4 }] }), /#define N 4/);
});

test('includes: nested, include-once, circular detection, failures', async () => {
   const files = {
      'a.glsl': '#include "b.glsl"\nfloat a(){return 1.0;}',
      'b.glsl': 'float b(){return 2.0;}',
      'loop.glsl': '#include "loop.glsl"\nfloat l;',
   };
   const loader = async p => { if (!(p in files)) throw new Error('404'); return files[p]; };

   const out = await resolveIncludes('#include "a.glsl"\n#include "b.glsl"\n#include "nope.glsl"', { loader, warn: quiet });
   assert.match(out, /begin include "a.glsl"/);
   assert.equal((out.match(/float b\(\)/g) || []).length, 1);
   assert.match(out, /already included/);
   assert.match(out, /failed include "nope.glsl"/);

   const warnings = [];
   const cyc = await resolveIncludes('#include "loop.glsl"', { loader, warn: (...a) => warnings.push(a.join(' ')) });
   assert.match(cyc, /circular/);
   assert.ok(warnings.some(w => w.includes('Circular')));
   await assert.rejects(resolveIncludes('#include "nope.glsl"', { loader, warn: quiet, throwOnError: true }), /404/);
});

test('FragCoord.xyz style: fragColor from main() is declared; user-declared vec4 u_mouse is respected', () => {
   const src = 'uniform vec2 u_resolution;\nuniform vec4 u_mouse;\nvoid main() { fragColor = vec4(u_mouse.xy / u_resolution, u_time_delta, 1.0); }';
   const gl2 = assembleFragment(src, { isGL2: true });
   assert.match(gl2, /out vec4 fragColor;/);
   assert.doesNotMatch(gl2, /uniform vec2 u_mouse/);           // user's vec4 wins
   assert.match(gl2, /uniform float u_time_delta;/);
   assert.equal((gl2.match(/void main\s*\(/g) || []).length, 1); // no mainImage wrap
   const gl1 = assembleFragment(src, { isGL2: false });
   assert.match(gl1, /#define fragColor gl_FragColor/);
   // no fragColor injection when the shader uses mainImage (the wrapper owns the output)
   assert.doesNotMatch(assembleFragment('void mainImage(out vec4 fragColor, in vec2 fc){ fragColor = vec4(1.0); }', { isGL2: true }), /out vec4 fragColor;/);
});

test('exactly one fragment output is declared on GL2', () => {
   const count = out => (out.match(/\bout\s+vec4\s+\w+\s*;/g) || []).length;   // declarations only, not mainImage params
   assert.equal(count(assembleFragment('void main(){ fragColor = vec4(1.0); }', { isGL2: true })), 1);
   assert.equal(count(assembleFragment('void mainImage(out vec4 c, in vec2 p){ c = vec4(1.0); }', { isGL2: true })), 1);
   assert.equal(count(assembleFragment('out vec4 myOut;\nvoid main(){ myOut = vec4(1.0); }', { isGL2: true })), 1);
});
