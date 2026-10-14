import { MAX_CHANNELS } from '../constants.js';
import { ShaderMateError } from '../utils/util.js';

/**
 * Normalize everything the user may pass as "the shaders" into an array of pass configs.
 *
 *   'frag.glsl' | '...glsl source...'         -> one screen pass
 *   { shader|src, ... }                        -> one pass
 *   [ 'a.glsl', { name, shader, ... }, ... ]   -> multipass (last one hits the screen unless `screen` is set)
 *
 * Caller objects are shallow-cloned; `uniforms` is kept by reference so live mutation works.
 */
export function normalizePasses(input) {
   let list;
   if (typeof input === 'string') list = [{ src: input }];
   else if (Array.isArray(input)) list = input.map(p => (typeof p === 'string' ? { src: p } : { ...p }));
   else if (input && typeof input === 'object') list = [{ ...input }];
   else throw new ShaderMateError('ShaderMate: expected a shader (string), a pass object, or an array of passes');
   if (!list.length) throw new ShaderMateError('ShaderMate: no passes given');

   list.forEach((p, i) => {
      if (p.src == null) p.src = p.shader ?? p.frag ?? p.fragment ?? p.glsl ?? p.url;
      if (p.src == null) throw new ShaderMateError(`Pass ${p.name ?? i} has no shader source (use "shader")`);
      if (p.name == null) p.name = list.length === 1 ? 'main' : 'pass' + i;
      if (p.uniforms == null) p.uniforms = {};
   });

   if (!list.some(p => p.screen)) list[list.length - 1].screen = true;
   if (list.filter(p => p.screen).length > 1) console.warn('[ShaderMate] Multiple screen:true passes; last drawn wins.');

   const names = list.map(p => p.name);
   const dupes = names.filter((n, i) => names.indexOf(n) !== i);
   if (dupes.length) throw new ShaderMateError('Duplicate pass names: ' + [...new Set(dupes)].join(', '));

   for (const p of list) {
      const chans = Array.isArray(p.channels) ? p.channels : (p.channels ? [p.channels] : []);
      p.channels = chans.slice(0, MAX_CHANNELS).map(c => normalizeChannel(c, names, p.name));
      while (p.channels.length < MAX_CHANNELS) p.channels.push(null);
   }
   return list;
}

const isEl = v => typeof HTMLElement !== 'undefined' && v instanceof HTMLElement;
const isBitmap = v => typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap;
const isTex = v => typeof WebGLTexture !== 'undefined' && v instanceof WebGLTexture;

/**
 * Channel shorthand:
 *   'BufferA'                       -> that pass's output (if a pass has that name), else an image URL
 *   { pass:'A' } / { id:'A' }       -> pass output   (buffer: 'prev' | 'current' for ping-pong passes)
 *   { url|image }, { video }, { audio|audioFFT }, { mic:true }, { camera:true }, { cubemap:[6 urls] }
 *   { element } or a raw <canvas>/<video>/<img>/ImageBitmap
 *   { texture: WebGLTexture, width, height, cube? }
 *   common params: wrap, filter, flipY, mipmap
 */
export function normalizeChannel(ch, passNames = [], ownerName = '') {
   if (ch == null || ch === false) return null;
   if (typeof ch === 'string') return passNames.includes(ch) ? { pass: ch } : { url: ch };
   if (isEl(ch) || isBitmap(ch)) return { element: ch };
   if (isTex(ch)) return { texture: ch };
   const out = { ...ch };
   if (out.pass == null && out.id != null) out.pass = out.id;
   if (out.url == null && out.image != null) out.url = out.image;
   if (out.element == null && out.canvas != null) out.element = out.canvas;
   if (out.pass == null && out.src != null && out.url == null && out.video == null) out.url = out.src;
   if (out.pass != null && !passNames.includes(out.pass)) {
      console.warn(`[ShaderMate] Pass "${ownerName}": channel references unknown pass "${out.pass}"`);
   }
   return out;
}

/** True if `src` is GLSL text rather than a URL/path. */
export function isInlineSource(src) {
   return /[\r\n]/.test(src) || /^\s*(void|#|precision|uniform|in |out |\/\/|\/\*)/.test(src) || /[{};]/.test(src);
}
