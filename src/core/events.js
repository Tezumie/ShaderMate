/**
 * Tiny event emitter. `forward(ev, data)` (optional) receives every emitted event,
 * which is how instances feed the global ShaderMate.on() bus.
 */
export function createEmitter(forward) {
   const map = new Map();

   function on(ev, fn) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(fn);
      return () => off(ev, fn);
   }
   function off(ev, fn) {
      const s = map.get(ev);
      if (s) s.delete(fn);
   }
   function once(ev, fn) {
      const wrapped = data => { off(ev, wrapped); fn(data); };
      return on(ev, wrapped);
   }
   function emit(ev, data) {
      const s = map.get(ev);
      if (s) {
         for (const fn of [...s]) {
            try { fn(data); } catch (e) { console.error(`[ShaderMate] error in "${ev}" listener`, e); }
         }
      }
      if (forward) forward(ev, data);
   }
   function clear() { map.clear(); }

   return { on, off, once, emit, clear };
}
