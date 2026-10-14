// Named sampler binding: any `uniform sampler2D u_xxx` that isn't an iChannelN gets a source
// by name — a pass (`u_blur`, `u_pass1`, `u_main`), a comment-annotated URL/ref (FragCoord.xyz),
// or a live input (`u_audio`, `u_keyboard`, `u_webcam`). Explicit `samplers: { name: source }`
// on the pass or instance wins over everything.

export const GL_SAMPLER_2D = 35678;
export const GL_SAMPLER_CUBE = 35680;

/** Aux (non-screen) passes in order: what FragCoord calls Pass 1, Pass 2… */
export const auxPasses = passObjs => passObjs.filter(p => !p.cfg.screen);

/**
 * Decide where each named sampler of a compiled pass comes from.
 * Returns [{ name, info, spec }] where spec is a channel spec ({ pass } | loader spec) or { array: [passObj…] }.
 */
export function resolveSamplerSpecs(po, passObjs, instanceSamplers = {}) {
   const out = [];
   const aux = auxPasses(passObjs);
   const screen = passObjs.find(p => p.cfg.screen);
   const byName = new Map(passObjs.map(p => [p.name, p]));
   const annotated = Object.assign({}, po.cfg.annotatedSamplers, po.cfg.samplers);

   for (const name in po.uniformInfo) {
      const info = po.uniformInfo[name];
      if (info.type !== GL_SAMPLER_2D && info.type !== GL_SAMPLER_CUBE) continue;
      if (/^iChannel\d$/.test(name)) continue;

      let spec = instanceSamplers[name] || annotated[name] || null;
      let m;
      if (spec && spec.sameAs) spec = annotated[spec.sameAs] || instanceSamplers[spec.sameAs] || null;

      if (!spec) {
         if (name === 'u_passes' && info.size > 1) spec = { array: aux.slice(0, info.size) };
         else if (name === 'u_main') spec = screen ? { pass: screen.name } : null;
         else if ((m = /^u_pass(\d+)$/.exec(name)) && aux[+m[1] - 1]) spec = { pass: aux[+m[1] - 1].name };
         else if (name.startsWith('u_') && byName.has(name.slice(2))) spec = { pass: name.slice(2) };
         else if (name === 'u_audio') spec = { mic: true, layout: 'spectrogram' };
         else if (name === 'u_keyboard') spec = { keyboard: true };
         else if (name === 'u_webcam') spec = { camera: true };
      }
      if (spec && spec.pass != null && !byName.has(spec.pass)) {
         // "pass1" style refs resolve by aux index too
         const mm = /^pass(\d+)$/.exec(spec.pass);
         if (mm && aux[+mm[1] - 1]) spec = { ...spec, pass: aux[+mm[1] - 1].name };
         else if (spec.pass === 'main' && screen) spec = { ...spec, pass: screen.name };
      }
      if (spec) out.push({ name, info, spec });
   }
   return out;
}

/** Does any pass sample the screen pass (so it needs a readable backbuffer)? */
export function needsMainBackbuffer(passObjs) {
   const screen = passObjs.find(p => p.cfg.screen);
   if (!screen) return false;
   return passObjs.some(po => (po.samplers || []).some(s => s.spec.pass === screen.name) ||
      po.cfg.channels.some(c => c && c.pass === screen.name));
}
