export class ShaderMateError extends Error {
   constructor(message, details) {
      super(message);
      this.name = 'ShaderMateError';
      if (details) Object.assign(this, details);
   }
}

const warned = new Set();
/** console.warn once per key. */
export function warnOnce(key, ...args) {
   if (warned.has(key)) return;
   warned.add(key);
   console.warn('[ShaderMate]', ...args);
}

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
export const isArrayLike = v => Array.isArray(v) || (ArrayBuffer.isView(v) && !(v instanceof DataView));
export const toArray = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
export const isPow2 = n => n > 0 && (n & (n - 1)) === 0;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** `glsl` tagged template: no-op, but lets editors syntax-highlight inline shaders. */
export const glsl = (strings, ...values) => String.raw({ raw: strings }, ...values);

/** Parse a CSS color ('#f80', 'rgb(…)', 'red') or [r,g,b,a] into [r,g,b,a] 0..1. */
export function parseColor(c) {
   if (c == null) return null;
   if (Array.isArray(c)) return [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 1];
   if (typeof c === 'string' && isBrowser) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const x = cv.getContext('2d');
      x.fillStyle = c;
      x.fillRect(0, 0, 1, 1);
      const d = x.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
   }
   return null;
}

/** True when running on localhost / file: — used for dev-only defaults. */
export function isDevHost() {
   if (!isBrowser) return false;
   const h = location.hostname;
   return location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '' || h.endsWith('.local');
}
