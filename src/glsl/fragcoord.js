// FragCoord.xyz conventions: multi-pass paste blobs and uniform comment annotations.
// Everything here is plain text processing; the runtime binds the results.

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Split a pasted multi-pass blob into passes. Recognised headers (each on its own line):
 *   // Pass 1          // Pass 2 — Horizontal blur      // Main
 *   // Common          // Pass: blur — Buffer type: 2D
 *   // ===== Pass: Name =====   (export style)
 * Returns null when no headers are present (plain single shader).
 */
export function splitPassBlob(text) {
   const re = /^[ \t]*\/\/[ \t]*(?:=+[ \t]*)?(?:Pass[ \t]*:?[ \t]*([^\n=—–-]+?)|(Main)|(Common))[ \t]*(?:[—–-]+[^\n]*)?(?:=+)?[ \t]*$/gim;
   const heads = [];
   let m;
   while ((m = re.exec(text))) heads.push({ index: m.index, end: m.index + m[0].length, raw: m[0], pass: m[1], main: !!m[2], common: !!m[3] });
   if (!heads.length) return null;

   const out = { common: text.slice(0, heads[0].index).trim(), passes: [] };
   heads.forEach((h, i) => {
      const body = text.slice(h.end, i + 1 < heads.length ? heads[i + 1].index : text.length).trim();
      if (h.common) { out.common = (out.common ? out.common + '\n' : '') + body; return; }
      const label = h.main ? 'main' : String(h.pass).trim();
      const bufferType = /buffer\s*type\s*:\s*(\w+)/i.exec(h.raw);
      const num = /^(\d+)$/.exec(label);
      out.passes.push({
         name: h.main ? 'main' : (num ? 'pass' + num[1] : label.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()),
         label,
         main: h.main,
         src: body,
         bufferType: bufferType ? bufferType[1].toLowerCase() : '2d',
      });
   });

   // Loose #define lines before the first header belong to Common (FragCoord hoists them).
   if (out.common && !/[{};]/.test(stripComments(out.common))) {
      // only defines/comments: fine as common
   }
   return out;
}

/** `[linear repeat mipmap]` / `[nearest clamp]` bracket settings -> channel params */
export function parseBracketSettings(s) {
   const p = {};
   const m = /\[([^\]]*)\]/.exec(s || '');
   if (!m) return p;
   for (const word of m[1].toLowerCase().split(/[\s,]+/)) {
      if (word === 'nearest' || word === 'linear') p.filter = word;
      else if (word === 'clamp' || word === 'repeat' || word === 'mirror') p.wrap = word;
      else if (word === 'mipmap') p.mipmap = true;
      else if (word === 'flipy' || word === 'flip') p.flipY = true;
   }
   return p;
}

/**
 * Parse uniform annotations FragCoord users write in comments and strip the (non-GLSL) initializers.
 *
 *   uniform float u_speed; //1.0, [0.0, 5.0]          -> value 1.0, min 0, max 5
 *   uniform float u_x = 0.5; //[0.0, 5.0]              -> value 0.5 (initializer removed from source)
 *   uniform vec3 u_color; //0.2, 0.55, 1.0, [0, 1]     -> value [0.2,0.55,1]
 *   uniform sampler2D u_tex; //https://x/y.png [linear repeat]
 *   uniform sampler2D u_clip; //https://x/loop.mp4     -> video + u_clip_time
 *   uniform sampler2D u_a; // ref:pass1 [nearest clamp] | ref:pass:blur | ref:main | ref:sampler u_tex
 *   uniform sampler2D u_audio; // mic | https://x.mp3 | [VIDEO] | [CAM]
 *
 * Returns { source, uniforms: { name: spec }, samplers: { name: channelSpec } }.
 */
export function parseUniformComments(src) {
   const uniforms = {};
   const samplers = {};
   const lines = src.split('\n');
   const re = /^\s*uniform\s+(?:(?:lowp|mediump|highp)\s+)?(\w+)\s+(\w+)(?:\s*\[\s*\d+\s*\])?\s*(?:=\s*([^;]+))?;\s*(?:\/\/(.*))?$/;

   const outLines = lines.map(line => {
      const m = re.exec(line);
      if (!m) return line;
      const [, type, name, init, comment = ''] = m;
      const c = comment.trim();
      const isSampler = /^sampler/.test(type);

      if (isSampler) {
         const spec = parseSamplerComment(name, c, type);
         if (spec) samplers[name] = spec;
      } else {
         const spec = {};
         const nums = s => (s.match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
         const range = /\[([^\]]*)\]/.exec(c);
         const defaults = nums(c.replace(/\[[^\]]*\]/, ''));
         const comps = /vec(\d)/.test(type) ? +type.match(/vec(\d)/)[1] : 1;
         const isBool = /^bool/.test(type);
         let value;
         if (init) {
            const v = nums(init);
            value = comps === 1 ? (isBool ? /true/.test(init) : (v[0] ?? 0)) : v.slice(0, comps);
         } else if (defaults.length) {
            value = comps === 1 ? defaults[0] : (defaults.length >= comps ? defaults.slice(0, comps) : new Array(comps).fill(defaults[0]));
         }
         if (range) {
            const r = nums(range[1]);
            if (r.length >= 2) { spec.min = r[0]; spec.max = r[1]; if (r.length >= 3) spec.step = r[2]; }
         }
         if (value !== undefined || range) {
            spec.value = value !== undefined ? value : (comps === 1 ? (spec.min ?? 0) : new Array(comps).fill(spec.min ?? 0));
            uniforms[name] = spec;
         }
      }
      // GLSL ES has no uniform initializers: `uniform float x = 0.5;` -> `uniform float x;`
      return init ? line.replace(/\s*=\s*[^;]+;/, ';') : line;
   });

   return { source: outLines.join('\n'), uniforms, samplers };
}

function parseSamplerComment(name, c, type) {
   const params = parseBracketSettings(c);
   const text = c.replace(/\[[^\]]*\]/g, '').trim();

   const ref = /^ref:\s*(.+)$/i.exec(text);
   if (ref) {
      const r = ref[1].trim();
      let m;
      if ((m = /^pass\s*(\d+)(?::out(\d+))?$/i.exec(r))) return { pass: 'pass' + m[1], ...params };
      if ((m = /^pass:\s*(\S+)/i.exec(r))) return { pass: m[1], ...params };
      if (/^main$/i.test(r)) return { pass: 'main', ...params };
      if ((m = /^sampler\s+(\w+)/i.exec(r))) return { sameAs: m[1], ...params };
      return null;
   }
   if (name === 'u_audio' || /audio/i.test(name) && /^(mic|\[CAM\]|\[VIDEO\])?$/i.test(text)) {
      if (/^https?:|^data:/i.test(text)) return { audio: text, layout: 'spectrogram' };
      return { mic: true, layout: 'spectrogram' };
   }
   if (name === 'u_webcam') return { camera: true, ...params };
   if (name === 'u_keyboard') return { keyboard: true };
   if (/^(https?:|data:)/i.test(text)) {
      const url = text.split(/\s+/)[0];
      if (/\.(mp4|webm|mov|ogv|m4v)(\?|$)/i.test(url)) return { video: url, ...params };
      if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i.test(url)) return { audio: url, layout: 'spectrogram' };
      return type === 'samplerCube' ? null : { url, ...params };
   }
   return null;
}

/** Does the source use `u_mouse` as a vec4 (any z/w access)? */
export function usesMouseVec4(src) {
   return /\bu_mouse\s*\.\s*[xyzw]*[zw]/.test(stripComments(src));
}

/** Does the source reference any of the given identifiers? */
export function usesAny(src, names) {
   const code = stripComments(src);
   return names.filter(n => new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(code));
}
