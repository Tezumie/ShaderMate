/**
 * Pointer state (mouse / touch / pen). Coordinates are canvas pixels with the origin at the
 * bottom-left (ShaderToy convention), computed from the canvas's *painted* box so they stay
 * correct with CSS scaling, devicePixelRatio and object-fit letterboxing.
 *
 * options.target: 'window' (default — hero text overlaying the canvas doesn't block input)
 *                 | 'canvas' | any Element
 * options.smooth: 0 (off) … 1   exponential smoothing applied per frame
 */
export function createPointer(canvas, getFit, options = {}) {
   const target = options.target === 'canvas' ? canvas
      : (options.target && typeof options.target === 'object') ? options.target
         : window;
   const smooth = +options.smooth || 0;

   const raw = { x: 0, y: 0, down: false, over: false, dragX: 0, dragY: 0, wheel: 0 };
   const state = { x: 0, y: 0, clickX: 0, clickY: 0, down: false, over: false, uvX: 0, uvY: 0, dragX: 0, dragY: 0, wheel: 0, clicked: false };
   let clickPending = false;
   let lastX = 0, lastY = 0;
   let moved = false;

   /** Painted rectangle of the bitmap inside the element box (accounts for object-fit). */
   function paintedRect() {
      const r = canvas.getBoundingClientRect();
      const fit = getFit ? getFit() : 'fill';
      if (!r.width || !r.height || (fit !== 'contain' && fit !== 'cover')) return r;
      const ba = canvas.width / canvas.height, ra = r.width / r.height;
      let w, h;
      if ((ra > ba) === (fit === 'contain')) { h = r.height; w = h * ba; } else { w = r.width; h = w / ba; }
      return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h, bottom: 0, right: 0 };
   }

   /** client (DOM) coords -> canvas pixel coords, bottom-left origin */
   function toShader(clientX, clientY) {
      const r = paintedRect();
      if (!r.width || !r.height) return [0, 0];
      return [
         (clientX - r.left) * (canvas.width / r.width),
         (r.top + r.height - clientY) * (canvas.height / r.height)
      ];
   }
   const toUV = (cx, cy) => { const [x, y] = toShader(cx, cy); return [x / canvas.width, y / canvas.height]; };

   const onMove = e => {
      const [x, y] = toShader(e.clientX, e.clientY);
      if (raw.down) { raw.dragX += x - lastX; raw.dragY += y - lastY; }   // cumulative click-and-drag offset
      lastX = x; lastY = y;
      raw.x = x; raw.y = y;
      raw.over = x >= 0 && y >= 0 && x <= canvas.width && y <= canvas.height;
      if (!moved) { moved = true; state.x = x; state.y = y; }
   };
   const onDown = e => {
      if (e.button !== undefined && e.button !== 0) return;
      onMove(e);
      if (target === window && !raw.over) return;  // clicks outside the canvas don't count as a press
      raw.down = true;
      state.down = true;
      clickPending = true;
      lastX = raw.x; lastY = raw.y;
      state.clickX = raw.x; state.clickY = raw.y;
      if (!smooth) { state.x = raw.x; state.y = raw.y; }
   };
   const onUp = () => { raw.down = false; state.down = false; };
   const onLeave = () => { raw.over = false; };
   const onWheel = e => { raw.wheel += -e.deltaY * 0.002; };          // mouse-wheel accumulator (exp(wheel) makes a nice zoom)

   if (options.touch !== false && target === canvas) canvas.style.touchAction = 'none';
   target.addEventListener('pointermove', onMove, { passive: true });
   target.addEventListener('pointerdown', onDown, { passive: true });
   window.addEventListener('pointerup', onUp, { passive: true });
   window.addEventListener('pointercancel', onUp, { passive: true });
   target.addEventListener('pointerleave', onLeave, { passive: true });
   target.addEventListener('wheel', onWheel, { passive: true });

   return {
      state,
      toShader,
      toUV,
      /** Call once per frame. */
      update() {
         if (smooth > 0 && smooth < 1) {
            const k = 1 - Math.pow(1 - smooth, 1); // per-frame factor
            state.x += (raw.x - state.x) * k;
            state.y += (raw.y - state.y) * k;
         } else { state.x = raw.x; state.y = raw.y; }
         state.over = raw.over;
         state.clicked = clickPending; clickPending = false;   // true for exactly one frame after a press
         state.dragX = raw.dragX; state.dragY = raw.dragY; state.wheel = raw.wheel;
         state.uvX = canvas.width ? state.x / canvas.width : 0;
         state.uvY = canvas.height ? state.y / canvas.height : 0;
      },
      dispose() {
         target.removeEventListener('pointermove', onMove);
         target.removeEventListener('pointerdown', onDown);
         window.removeEventListener('pointerup', onUp);
         window.removeEventListener('pointercancel', onUp);
         target.removeEventListener('pointerleave', onLeave);
         target.removeEventListener('wheel', onWheel);
      }
   };
}
