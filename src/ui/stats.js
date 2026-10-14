import { resolveTheme } from './theme.js';

/**
 * Stats overlay (FPS, frame time, CPU time, frame count, resolution).
 * Nothing is installed unless you ask: stats: true (visible) | 'key' (hidden until the key is pressed).
 */
export function createStats({ visible = false, key = 'F1', position = 'top-left', theme } = {}) {
   const T = resolveTheme(theme);
   const el = document.createElement('div');
   const [v, h] = position.split('-');
   el.style.cssText =
      `position:fixed;${v === 'bottom' ? 'bottom' : 'top'}:12px;${h === 'right' ? 'right' : 'left'}:12px;` +
      `z-index:2147483647;min-width:168px;padding:8px 10px;border:1px solid ${T.border};border-radius:${T.radius};` +
      `background:${T.bg}e6;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:${T.shadow};` +
      `color:${T.text};font:12px/1.5 ${T.mono};pointer-events:none;display:none`;
   document.body.appendChild(el);

   const row = (label, value) =>
      `<div style="display:flex;justify-content:space-between;gap:14px"><span style="color:${T.label}">${label}</span><span style="color:${T.textStrong}">${value}</span></div>`;

   let shown = false;
   let accDt = 0, accCpu = 0, n = 0, lastDom = 0;

   function show(on = true) {
      shown = !!on;
      el.style.display = shown ? 'block' : 'none';
      accDt = accCpu = n = 0;
   }
   const toggle = () => show(!shown);
   const onKey = e => { if (e.key === key) { e.preventDefault(); toggle(); } };
   if (key) window.addEventListener('keydown', onKey);
   show(visible);

   return {
      show, toggle,
      isVisible: () => shown,
      update(info) {
         if (!shown) return;
         accDt += info.rawDt; accCpu += info.cpuMs; n++;
         const now = performance.now();
         if (now - lastDom < 250) return;
         lastDom = now;
         const ms = (accDt / n) * 1000;
         el.innerHTML =
            `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px"><b style="color:${T.accent};font-size:16px;font-weight:600">${(1000 / ms).toFixed(0)}<span style="font-size:11px;color:${T.label};font-weight:400"> fps</span></b><span style="color:${T.label}">${ms.toFixed(1)} ms</span></div>` +
            row('cpu', (accCpu / n).toFixed(2) + ' ms') +
            row('frame', info.frame) +
            row('time', info.time.toFixed(2) + ' s') +
            row('size', `${info.width}×${info.height}`) +
            row('passes', info.passes);
         accDt = accCpu = n = 0;
      },
      dispose() {
         if (key) window.removeEventListener('keydown', onKey);
         el.remove();
      }
   };
}
