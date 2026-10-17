// Flow field: ink is advected through a curl-noise velocity field inside a ping-pong
// float buffer (pass "flow"), then a second pass tone-maps it to the screen.
//
//   flow  -> half-resolution RGBA16F, pingpong, reads its own previous frame
//   image -> full-resolution screen pass, reads "flow"

const sm = ShaderMate.createShader({
   passes: [
      {
         name: 'flow',
         shader: 'flow.glsl',
         size: 0.5,                        // simulate at half res: cheap and plenty smooth
         pingpong: true,
         float: true,
         filter: 'linear',
         channels: ['flow'],               // previous frame
         uniforms: {
            u_decay: { value: 0.992, min: 0.9, max: 1.0, step: 0.001, label: 'Decay' },
            u_speed: { value: 1.0, min: 0, max: 3, label: 'Flow speed' },
            u_scaleN: { value: 2.5, min: 0.5, max: 8, label: 'Noise scale' },
            u_brush: { value: 0.05, min: 0.01, max: 0.2, label: 'Brush size' },
            u_emit: { value: true, label: 'Auto emitters' },
         },
      },
      {
         name: 'image',
         shader: 'image.glsl',
         channels: ['flow'],
         uniforms: {
            u_exposure: { value: 1.4, min: 0.2, max: 4, label: 'Exposure' },
            u_glow: { value: 0.6, min: 0, max: 2, label: 'Glow' },
         },
      },
   ],
   stats: 'key',                           // F1 toggles the stats overlay
   statsPosition: 'bottom-right',
   theme: window.SITE_THEME,
});

// The panel goes in a box just below the page's top bar (lil-gui's default spot is the very corner).
const panel = document.body.appendChild(document.createElement('div'));
panel.style.cssText = 'position: fixed; top: 64px; right: 16px; z-index: 10';
ShaderMate.createGui(sm, { title: 'Flow field', container: panel });

addEventListener('keydown', e => {
   if (e.key === 'c') { sm.set('u_clear', 1); setTimeout(() => sm.set('u_clear', 0), 50); }
});
