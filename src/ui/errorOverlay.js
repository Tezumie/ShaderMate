import { resolveTheme } from './theme.js';

/**
 * Compile-error overlay drawn over the canvas (dev aid). Enabled by default on localhost
 * (errorOverlay: 'auto'); set errorOverlay: true/false to force.
 */
export function createErrorOverlay(canvas, theme) {
   const T = resolveTheme(theme);
   let el = null;

   function place() {
      if (!el) return;
      const r = canvas.getBoundingClientRect();
      Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
   }
   const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

   return {
      show(err) {
         if (!el) {
            el = document.createElement('div');
            el.style.cssText =
               'position:fixed;z-index:2147483646;box-sizing:border-box;overflow:auto;padding:16px;' +
               `background:${T.bgAlt}f2;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:${T.text};font:13px/1.55 ${T.font}`;
            document.body.appendChild(el);
            window.addEventListener('resize', place);
         }
         const errors = err.errors || [];
         const title = esc(err.message.split('\n')[0]);
         let body = '';
         if (errors.length) {
            body = errors.map(e =>
               `<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;padding:10px 12px;border:1px solid ${T.border};border-radius:${T.radius};background:${T.bg};margin-bottom:8px">` +
               `<span style="color:${T.red};font-family:${T.mono};font-size:12px">line ${e.line}</span><span style="color:${T.textStrong}">${esc(e.message)}</span>` +
               `<span></span><code style="color:${T.label};font-family:${T.mono};font-size:12px;white-space:pre-wrap">${esc(e.source.trim())}</code></div>`).join('');
         } else if (err.log) {
            body = `<pre style="margin:0;padding:10px 12px;border:1px solid ${T.border};border-radius:${T.radius};background:${T.bg};color:${T.label};font:12px/1.5 ${T.mono};white-space:pre-wrap">${esc(err.log)}</pre>`;
         }
         el.innerHTML =
            `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">` +
            `<span style="display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:11px;background:${T.redSoft};color:${T.redText};font-size:11.5px;font-weight:500">Shader error</span>` +
            `<b style="color:${T.textStrong};font-weight:600">${title}</b></div>` + body;
         el.style.display = 'block';
         place();
      },
      hide() { if (el) el.style.display = 'none'; },
      dispose() { if (el) { el.remove(); window.removeEventListener('resize', place); el = null; } }
   };
}
