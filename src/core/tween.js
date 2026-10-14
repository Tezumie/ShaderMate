// Tiny tween engine for uniforms: sm.tween('u_hover', 1, { duration: 400, ease: 'outCubic' })

export const EASES = {
   linear: t => t,
   inQuad: t => t * t,
   outQuad: t => t * (2 - t),
   inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
   inCubic: t => t * t * t,
   outCubic: t => 1 - Math.pow(1 - t, 3),
   inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
   outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
   outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
   outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};

export function createTweens() {
   const active = new Map(); // key -> tween

   /**
    * getter/setter work on the live uniform value. Resolves when finished (false if interrupted).
    */
   function tween(key, get, set, to, opts = {}) {
      const { duration = 500, delay = 0 } = opts;
      const ease = typeof opts.ease === 'function' ? opts.ease : (EASES[opts.ease] || EASES.outCubic);
      const prev = active.get(key);
      if (prev) prev.resolve(false);

      const from = get();
      const isArr = Array.isArray(to) || ArrayBuffer.isView(to);
      const f = isArr ? Array.from(from ?? to) : Number(from ?? 0);
      const t = isArr ? Array.from(to) : Number(to);

      return new Promise(resolve => {
         const tw = {
            start: performance.now() + delay,
            resolve: v => { active.delete(key); resolve(v); },
            update(now) {
               const p = duration > 0 ? clamp01((now - this.start) / duration) : 1;
               if (p < 0) return;
               const e = ease(p);
               set(isArr ? f.map((a, i) => a + (t[i] - a) * e) : f + (t - f) * e);
               if (p >= 1) this.resolve(true);
            }
         };
         active.set(key, tw);
      });
   }

   function update(now) {
      for (const tw of [...active.values()]) tw.update(now);
   }

   function cancel(key) {
      if (key === undefined) { for (const tw of [...active.values()]) tw.resolve(false); return; }
      const tw = active.get(key);
      if (tw) tw.resolve(false);
   }

   return { tween, update, cancel, get size() { return active.size; } };
}

const clamp01 = v => (v < 0 ? v : v > 1 ? 1 : v);
