// Optional uniform inspector built on lil-gui (MIT). Separate entry so the core stays dependency-free.
//
//   import { createGui } from 'shadermate/gui';      // npm: `npm i lil-gui`
//   <script src="dist/shadermate-gui.js"></script>   // browser: bundles lil-gui, adds ShaderMate.createGui()
//
//   const gui = await createGui(sm, { title: 'Hero', controls: true });
//
// Uniform hints (on a uniform spec):  { value, min, max, step, label, color: true, hidden: true }

import GUI from 'lil-gui';
import { resolveTheme } from '../ui/theme.js';

const isArrayLike = v => Array.isArray(v) || (ArrayBuffer.isView(v) && !(v instanceof DataView));
const isSpec = v => v != null && typeof v === 'object' && !isArrayLike(v) && 'value' in v;

function describe(entry) {
   const spec = isSpec(entry) ? entry : { value: entry };
   if (spec.hidden) return null;
   const v = spec.value;
   const t = typeof spec.type === 'string' ? spec.type.toLowerCase() : '';
   if (/mat|matrix|sampler/.test(t)) return null;
   if (typeof v === 'boolean' || t === 'bool' || t === 'boolean') return { kind: 'bool', spec };
   if (typeof v === 'number') return { kind: /int|^\d?i/.test(t) ? 'int' : 'float', spec };
   if (isArrayLike(v) && v.length >= 2 && v.length <= 4 && typeof v[0] === 'number') {
      return { kind: spec.color && v.length >= 3 ? 'color' : 'vec', n: v.length, spec };
   }
   return null;
}

function range(value, spec, isInt) {
   const abs = Math.abs(value) || 1;
   const max = spec.max ?? (isInt ? Math.max(10, abs * 2) : abs * 2);
   const min = spec.min ?? (value < 0 ? -max : 0);
   const step = spec.step ?? (isInt ? 1 : (max - min) / 200);
   return { min, max, step };
}

function addUniform(folder, sm, name, entry, passName) {
   const d = describe(entry);
   if (!d) return;
   const { spec } = d;
   const label = spec.label || name;
   const proxy = {};
   const push = v => sm.set(name, v, passName);

   if (d.kind === 'bool') {
      proxy[name] = !!spec.value;
      folder.add(proxy, name).name(label).onChange(push);
   } else if (d.kind === 'float' || d.kind === 'int') {
      proxy[name] = spec.value;
      const r = range(spec.value, spec, d.kind === 'int');
      folder.add(proxy, name, r.min, r.max, r.step).name(label).onChange(push).listen();
      // keep slider in sync with tweens / sm.set()
      Object.defineProperty(proxy, name, { get: () => sm.get(name, passName), set: push });
   } else if (d.kind === 'color') {
      // lil-gui edits this array in place, so it stays the same object; follow() refreshes it from sm.get().
      const buf = proxy[name] = Array.from(spec.value).slice(0, 3);
      const alpha = spec.value.length === 4 ? spec.value[3] : null;
      const ctrl = folder.addColor(proxy, name).name(label).onChange(c => push(alpha === null ? Array.from(c) : [...c, alpha]));
      follow(sm, () => sm.get(name, passName), buf, () => ctrl.updateDisplay());
   } else {
      const sub = folder.addFolder(label);
      const comps = ['x', 'y', 'z', 'w'].slice(0, d.n);
      const cur = Array.from(spec.value);
      const ctrls = comps.map((c, i) => {
         proxy[c] = cur[i];
         const r = range(cur[i], spec, false);
         return sub.add(proxy, c, r.min, r.max, r.step).onChange(v => { cur[i] = v; push(cur.slice()); });
      });
      follow(sm, () => sm.get(name, passName), cur, () => comps.forEach((c, i) => { proxy[c] = cur[i]; ctrls[i].updateDisplay(); }));
   }
}

/** Keep a colour / vector control in sync when the uniform changes elsewhere (sm.set, sm.tween, your own code). */
function follow(sm, read, local, refresh) {
   sm.on('afterFrame', () => {
      const v = read();
      if (v == null || typeof v !== 'object') return;
      let changed = false;
      for (let i = 0; i < local.length; i++) if (v[i] !== undefined && Math.abs(v[i] - local[i]) > 1e-6) { local[i] = v[i]; changed = true; }
      if (changed) refresh();
   });
}

/**
 * Build the panel. Resolves to the lil-gui instance once the ShaderMate instance is ready.
 * opts: { title, container, open, controls (play/pause, time scale, capture), uniforms (true | string[]) }
 */
export async function createGui(sm, opts = {}) {
   await sm.ready;
   const gui = new GUI({ title: opts.title || 'ShaderMate', container: opts.container, width: opts.width || 280 });
   if (opts.open === false) gui.close();
   if (opts.theme !== false) applyTheme(gui, resolveTheme(opts.theme === undefined ? sm.theme : opts.theme));
   sm.on('destroy', () => gui.destroy());

   if (opts.controls !== false) {
      const c = gui.addFolder('Playback');
      const ctl = {
         get playing() { return sm.playing; }, set playing(v) { v ? sm.play() : sm.pause(); },
         get timeScale() { return sm.timeScale; }, set timeScale(v) { sm.timeScale = v; },
         get time() { return sm.time; }, set time(v) { sm.seek(v); },
         screenshot: () => sm.download(),
         record5s: () => sm.record({ duration: 5000, download: 'shadermate.webm' }),
         stats: () => sm.stats.toggle(),
      };
      c.add(ctl, 'playing').listen();
      c.add(ctl, 'timeScale', -2, 4, 0.01).listen();
      c.add(ctl, 'time').listen().decimals(2);
      c.add(ctl, 'screenshot');
      c.add(ctl, 'record5s').name('record 5s');
      c.add(ctl, 'stats');
      c.close();
   }

   const only = Array.isArray(opts.uniforms) ? new Set(opts.uniforms) : null;
   if (opts.uniforms !== false) {
      const seen = new Set();
      const addAll = (folder, map, passName) => {
         for (const name in map) {
            if (only && !only.has(name)) continue;
            if (seen.has(name)) continue;
            seen.add(name);
            addUniform(folder, sm, name, map[name], passName);
         }
      };
      addAll(gui, sm.uniforms);
      for (const po of sm.passes) {
         if (!Object.keys(po.cfg.uniforms).length) continue;
         addAll(sm.passes.length > 1 ? gui.addFolder(po.name) : gui, po.cfg.uniforms, sm.passes.length > 1 ? po.name : undefined);
      }
   }
   return gui;
}

/** Skin lil-gui through its CSS variables so it matches ShaderMate's overlays (dark editor palette). */
export function applyTheme(gui, T) {
   const el = gui.domElement;
   const vars = {
      '--background-color': T.bg, '--text-color': T.text, '--title-background-color': T.bgAlt, '--title-text-color': T.textStrong,
      '--widget-color': T.raised, '--hover-color': T.hover, '--focus-color': T.border, '--number-color': T.number, '--string-color': T.string,
      '--font-family': T.font, '--font-size': '12px', '--input-font-size': '12px', '--font-family-mono': T.mono,
      '--padding': '6px', '--spacing': '4px', '--widget-height': '22px', '--title-height': '28px', '--name-width': '42%',
      '--widget-border-radius': '5px', '--checkbox-size': '14px', '--slider-knob-width': '3px', '--folder-indent': '10px',
   };
   for (const k in vars) el.style.setProperty(k, vars[k]);
   Object.assign(el.style, { border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow });
   if (!gui.parent && !el.style.position) { el.style.top = '12px'; el.style.right = '12px'; }
   return gui;
}

export { GUI };
