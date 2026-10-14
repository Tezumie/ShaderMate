// Canvas sizing.
//
//   size: 'canvas'   (default when you pass a canvas)  bitmap follows the canvas's CSS box — style it
//                    however you like (width:100%; height:60vh …) and ShaderMate keeps up.
//   size: 'window'   (default when no canvas is given)  fixed full-window canvas.
//   size: [w, h]     fixed internal resolution; CSS box is yours, `fit` decides how it's shown.
//
//   pixelRatio: 'auto' (default, capped by maxPixelRatio = 2) | number
//   scale: 1         extra render-scale multiplier (0.5 = render at half res, cheap on big heroes)
//   aspect: 16/9 | '16:9' | [16, 9]   lock the bitmap aspect; shown with object-fit
//   fit: 'contain' | 'cover' | 'fill'  how a fixed/aspect-locked bitmap fills its CSS box

function parseAspect(a) {
   if (!a) return 0;
   if (typeof a === 'number') return a;
   if (Array.isArray(a)) return a[0] / a[1];
   if (typeof a === 'string') {
      const m = a.split(/[:/x]/).map(Number);
      return m.length === 2 && m[1] ? m[0] / m[1] : Number(a) || 0;
   }
   return 0;
}

export function parseSizing(options = {}, hasCanvas = true) {
   const s = options.size ?? options.sizing;
   const cfg = {
      mode: hasCanvas ? 'canvas' : 'window',
      width: 0, height: 0,
      aspect: parseAspect(options.aspect),
      fit: options.fit || 'contain',
      pixelRatio: options.pixelRatio ?? options.dpr ?? 'auto',
      maxPixelRatio: options.maxPixelRatio ?? 2,
      scale: options.scale ?? options.renderScale ?? 1,
   };
   if (Array.isArray(s)) { cfg.mode = 'fixed'; cfg.width = s[0]; cfg.height = s[1]; }
   else if (typeof s === 'string') cfg.mode = s === 'screen' || s === 'fullscreen' ? 'window' : s === 'element' ? 'canvas' : s;
   else if (s && typeof s === 'object') { cfg.mode = 'fixed'; cfg.width = s.width; cfg.height = s.height; if (s.fit) cfg.fit = s.fit; }
   if (cfg.mode === 'fixed') cfg.aspect = cfg.width / cfg.height;
   return cfg;
}

export function createSizer(canvas, options = {}, hasCanvas = true) {
   const cfg = parseSizing(options, hasCanvas);
   const ratio = () => (cfg.pixelRatio === 'auto'
      ? Math.min(window.devicePixelRatio || 1, cfg.maxPixelRatio)
      : (Number(cfg.pixelRatio) || 1));
   let styled = false;

   function cssBox() {
      if (cfg.mode === 'window') return { w: window.innerWidth, h: window.innerHeight };
      return { w: canvas.clientWidth || window.innerWidth, h: canvas.clientHeight || window.innerHeight };
   }

   function measure() {
      if (cfg.mode === 'fixed') return { w: cfg.width, h: cfg.height };
      const box = cssBox();
      const k = ratio() * cfg.scale;
      let w = box.w, h = box.h;
      if (cfg.aspect) {
         if (w / h > cfg.aspect) w = h * cfg.aspect; else h = w / cfg.aspect;
      }
      return { w: w * k, h: h * k };
   }

   function applyStyle() {
      if (styled) return;
      styled = true;
      if (cfg.mode === 'window') {
         canvas.style.cssText += ';display:block;position:fixed;left:0;top:0;width:100%;height:100%;';
      }
      if (cfg.mode === 'fixed' || cfg.aspect) canvas.style.objectFit = cfg.fit;
   }

   return {
      cfg,
      /** 'contain' | 'cover' | 'fill' as currently applied (for pointer mapping). */
      fit: () => ((cfg.mode === 'fixed' || cfg.aspect) ? cfg.fit : 'fill'),
      setFixed(w, h) { cfg.mode = 'fixed'; cfg.width = w; cfg.height = h; cfg.aspect = w / h; styled = false; },
      /** Recompute; returns true when the bitmap size changed. */
      update() {
         applyStyle();
         const m = measure();
         const w = Math.max(1, Math.round(m.w)), h = Math.max(1, Math.round(m.h));
         if (canvas.width === w && canvas.height === h) return false;
         canvas.width = w;
         canvas.height = h;
         return true;
      },
      /** Call `fn` on window resize / canvas box changes. Returns a disposer. */
      observe(fn) {
         let pending = false;
         const schedule = () => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => { pending = false; fn(); });
         };
         window.addEventListener('resize', schedule);
         let ro = null;
         if (cfg.mode === 'canvas' && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(schedule);
            ro.observe(canvas);
         }
         return () => { window.removeEventListener('resize', schedule); if (ro) ro.disconnect(); };
      }
   };
}
