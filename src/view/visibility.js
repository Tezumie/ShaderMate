/**
 * Tracks whether rendering is worthwhile: tab visible AND canvas in (or near) the viewport.
 * Saves battery on long pages with a hero at the top.
 */
export function createVisibility(canvas, { enabled = true, margin = '100px', onChange } = {}) {
   let tabVisible = typeof document === 'undefined' ? true : !document.hidden;
   let inView = true;
   const notify = () => onChange && onChange(tabVisible && inView);

   const onVis = () => { tabVisible = !document.hidden; notify(); };
   let io = null;
   if (enabled) {
      document.addEventListener('visibilitychange', onVis);
      if (typeof IntersectionObserver !== 'undefined') {
         io = new IntersectionObserver(entries => {
            // A canvas that isn't in the document (an offscreen render source for another library, a texture
            // generator…) always reports "not intersecting"; it can't scroll out of view, so keep it rendering.
            for (const e of entries) inView = e.isIntersecting || !e.target.isConnected;
            notify();
         }, { rootMargin: margin });
         io.observe(canvas);
      }
   }
   return {
      get visible() { return tabVisible && inView; },
      dispose() {
         if (enabled) document.removeEventListener('visibilitychange', onVis);
         if (io) io.disconnect();
      }
   };
}
