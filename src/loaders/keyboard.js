/**
 * Keyboard state texture, ShaderToy layout (also what FragCoord.xyz's u_keyboard describes):
 *   256 x 3, 8-bit, one column per key code:
 *     row 0  key currently held        (texelFetch(k, ivec2(code, 0), 0).x)
 *     row 1  key pressed this frame
 *     row 2  toggle (flips on each press)
 * Key codes follow ShaderToy: JS keyCode (letters are their uppercase ASCII, 32 = space, 37..40 = arrows…).
 *   { keyboard: true }   or   { keyboard: { target: element } }
 */
export function loadKeyboard(gl, pool, ch = {}) {
   const W = 256, ROWS = 3;
   const data = new Uint8Array(W * ROWS);
   const held = new Uint8Array(W);
   const pressed = new Uint8Array(W);
   const toggle = new Uint8Array(W);
   const target = (ch.keyboard && typeof ch.keyboard === 'object' && ch.keyboard.target) || window;

   const code = e => {
      if (typeof e.keyCode === 'number' && e.keyCode) return e.keyCode & 255;
      const k = e.key || '';
      return k.length === 1 ? k.toUpperCase().charCodeAt(0) & 255 : 0;
   };
   const onDown = e => {
      const c = code(e);
      if (!held[c]) { pressed[c] = 255; toggle[c] = toggle[c] ? 0 : 255; }
      held[c] = 255;
   };
   const onUp = e => { held[code(e)] = 0; };
   const onBlur = () => held.fill(0);
   target.addEventListener('keydown', onDown);
   target.addEventListener('keyup', onUp);
   window.addEventListener('blur', onBlur);

   const tex = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, tex);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   const upload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, ROWS, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
      gl.bindTexture(gl.TEXTURE_2D, null);
   };
   upload();

   return Promise.resolve({
      texId: pool.add(tex, 'texture2D'),
      width: W, height: ROWS,
      keyboard: true,
      update() {
         data.set(held, 0);
         data.set(pressed, W);
         data.set(toggle, W * 2);
         upload();
         pressed.fill(0);              // "pressed" lasts exactly one frame
      },
      dispose() {
         target.removeEventListener('keydown', onDown);
         target.removeEventListener('keyup', onUp);
         window.removeEventListener('blur', onBlur);
      }
   });
}
