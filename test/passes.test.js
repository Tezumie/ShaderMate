import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePasses, normalizeChannel, isInlineSource } from '../src/core/passes.js';
import { resolvePassSize } from '../src/gl/targets.js';
import { parseSizing } from '../src/view/sizing.js';

test('string source -> single screen pass', () => {
   const [p] = normalizePasses('frag.glsl');
   assert.equal(p.name, 'main');
   assert.equal(p.screen, true);
   assert.equal(p.channels.length, 4);
});

test('last pass becomes the screen pass; caller objects are not mutated', () => {
   const input = [{ name: 'A', shader: 'a.glsl' }, { name: 'B', shader: 'b.glsl' }];
   const out = normalizePasses(input);
   assert.equal(out[1].screen, true);
   assert.equal(out[0].screen, undefined);
   assert.equal(out[0].src, 'a.glsl');
   assert.equal(input[1].screen, undefined);
});

test('uniforms object is shared by reference (live mutation keeps working)', () => {
   const uniforms = { u_x: { type: 'float', value: 1 } };
   const [p] = normalizePasses([{ src: 'a.glsl', uniforms }]);
   assert.equal(p.uniforms, uniforms);
});

test('errors: no source, duplicate names, bad input', () => {
   assert.throws(() => normalizePasses([{ name: 'x' }]), /no shader source/);
   assert.throws(() => normalizePasses([{ name: 'a', src: 'x' }, { name: 'a', src: 'y' }]), /Duplicate/);
   assert.throws(() => normalizePasses(42), /expected/);
});

test('channels: id (docs) and pass (code) both work; strings; nulls; aliases', () => {
   const names = ['BufferA', 'Image'];
   assert.equal(normalizeChannel({ id: 'BufferA' }, names).pass, 'BufferA');
   assert.equal(normalizeChannel({ pass: 'BufferA' }, names).pass, 'BufferA');
   assert.deepEqual(normalizeChannel('BufferA', names), { pass: 'BufferA' });
   assert.deepEqual(normalizeChannel('tex.png', names), { url: 'tex.png' });
   assert.equal(normalizeChannel({ image: 'x.png' }, names).url, 'x.png');
   assert.equal(normalizeChannel(null, names), null);
   const out = normalizePasses([{ name: 'BufferA', src: 'a' }, { name: 'Image', src: 'b', channels: [{ id: 'BufferA' }, null, 'tex.png'] }]);
   assert.equal(out[1].channels[0].pass, 'BufferA');
   assert.equal(out[1].channels[2].url, 'tex.png');
   assert.equal(out[1].channels[3], null);
});

test('inline GLSL detection', () => {
   assert.equal(isInlineSource('void mainImage(out vec4 c, in vec2 p){}'), true);
   assert.equal(isInlineSource('#version 300 es\nvoid main(){}'), true);
   assert.equal(isInlineSource('shaders/frag.glsl'), false);
   assert.equal(isInlineSource('https://example.com/a.glsl?v=2'), false);
});

test('pass sizes', () => {
   assert.deepEqual(resolvePassSize('screen', 800, 600), [800, 600]);
   assert.deepEqual(resolvePassSize('half', 800, 600), [400, 300]);
   assert.deepEqual(resolvePassSize(0.5, 801, 601), [401, 301]);
   assert.deepEqual(resolvePassSize([256, 128], 800, 600), [256, 128]);
   assert.deepEqual(resolvePassSize({ width: 64, height: 32 }, 800, 600), [64, 32]);
   assert.deepEqual(resolvePassSize('half', 1, 1), [1, 1]);
});

test('sizing option parsing', () => {
   assert.equal(parseSizing({}, true).mode, 'canvas');
   assert.equal(parseSizing({}, false).mode, 'window');
   assert.equal(parseSizing({}).pixelRatio, 'auto');
   assert.equal(parseSizing({ size: [640, 360] }).mode, 'fixed');
   assert.equal(parseSizing({ size: [640, 360] }).aspect.toFixed(3), '1.778');
   assert.equal(parseSizing({ aspect: '16:9' }).aspect.toFixed(3), '1.778');
   assert.equal(parseSizing({ aspect: [4, 3] }).aspect.toFixed(3), '1.333');
   assert.equal(parseSizing({ size: 'element' }).mode, 'canvas');
   assert.equal(parseSizing({ size: 'screen' }).mode, 'window');
   assert.equal(parseSizing({ scale: 0.5 }).scale, 0.5);
});
