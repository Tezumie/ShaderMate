import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitPassBlob, parseUniformComments, usesMouseVec4 } from '../src/glsl/fragcoord.js';
import { looksLikeFragCoord } from '../src/glsl/builtins.js';
import { assembleFragment } from '../src/glsl/preprocess.js';

test('splitPassBlob: Common / Pass N / Main headers', () => {
   const blob = `// Common
#define PI 3.14
// Pass 1
void main(){ fragColor = vec4(1.0); }
// Pass 2 — Blur
void main(){ fragColor = texture(u_pass1, gl_FragCoord.xy/u_resolution); }
// Main
void main(){ fragColor = texture(u_pass2, gl_FragCoord.xy/u_resolution); }`;
   const r = splitPassBlob(blob);
   assert.equal(r.common, '#define PI 3.14');
   assert.deepEqual(r.passes.map(p => p.name), ['pass1', 'pass2', 'main']);
   assert.equal(r.passes[2].main, true);
   assert.match(r.passes[1].src, /u_pass1/);
});

test('splitPassBlob: export style with named pass and buffer type', () => {
   const r = splitPassBlob(`// ===== Pass: Flow =====\nvoid main(){}\n// Pass: map — Buffer type: 3D\nvoid main(){}\n// Main\nvoid main(){}`);
   assert.equal(r.passes[0].name, 'flow');
   assert.equal(r.passes[1].bufferType, '3d');
   assert.equal(splitPassBlob('void main(){ fragColor = vec4(1.0); }'), null);
});

test('parseUniformComments: ranges, defaults, initializers stripped', () => {
   const src = `uniform float u_speed; //1.0, [0.0, 5.0]
uniform float u_x = 0.5; //[0, 5]
uniform vec3 u_color; //0.2, 0.55, 1.0, [0, 1]
uniform sampler2D u_tex; //https://example.com/a.png [linear repeat]
uniform sampler2D u_clip; //https://example.com/loop.mp4
uniform sampler2D u_prev; // ref:pass1 [nearest clamp]
uniform sampler2D u_audio; // mic
uniform float u_plain;`;
   const r = parseUniformComments(src);
   assert.deepEqual(r.uniforms.u_speed, { value: 1, min: 0, max: 5 });
   assert.deepEqual(r.uniforms.u_x, { value: 0.5, min: 0, max: 5 });
   assert.deepEqual(r.uniforms.u_color, { value: [0.2, 0.55, 1], min: 0, max: 1 });
   assert.equal(r.uniforms.u_plain, undefined);
   assert.deepEqual(r.samplers.u_tex, { url: 'https://example.com/a.png', filter: 'linear', wrap: 'repeat' });
   assert.deepEqual(r.samplers.u_clip, { video: 'https://example.com/loop.mp4' });
   assert.deepEqual(r.samplers.u_prev, { pass: 'pass1', filter: 'nearest', wrap: 'clamp' });
   assert.deepEqual(r.samplers.u_audio, { mic: true, layout: 'spectrogram' });
   assert.match(r.source, /uniform float u_x;/);
   assert.doesNotMatch(r.source, /= 0\.5/);
});

test('FragCoord dialect: builtins declared, u_mouse vec4, u_scroll float, u_passN samplers', () => {
   const src = `void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 c = texture(u_pass1, uv).rgb + u_mouse.z + u_scroll + float(u_frame) + u_camera_pos.x;
  fragColor = vec4(c, 1.0);
}`;
   assert.equal(looksLikeFragCoord(src), true);
   assert.equal(usesMouseVec4(src), true);
   const frag = assembleFragment(src, { isGL2: true, builtinOpts: { fragcoord: true, mouseVec4: true, scrollFloat: true, samplerNames: ['u_pass1', 'u_main'], passCount: 1 } });
   assert.match(frag, /uniform vec4 u_mouse;/);
   assert.match(frag, /uniform float u_scroll;/);
   assert.match(frag, /uniform int u_frame;/);
   assert.match(frag, /uniform sampler2D u_pass1;/);
   assert.doesNotMatch(frag, /uniform sampler2D u_main;/);
   assert.match(frag, /uniform vec3 u_camera_pos;/);
   assert.equal((frag.match(/out vec4 fragColor;/g) || []).length, 1);
});
