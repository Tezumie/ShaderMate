/**
 * Fly camera for `u_camera_pos` / `u_camera_dir` / `u_camera_view` (FragCoord.xyz convention).
 *   WASD / arrows move, Q/E (or Space/Shift) down/up, mouse drag looks around, wheel dollies.
 *   u_camera_view is the world-to-camera matrix, column-major (OpenGL convention), so
 *   mat3(u_camera_view) * dir goes world->camera and transpose goes back.
 */
export function createCamera(canvas, { target = window, speed = 1.5, sensitivity = 0.004 } = {}) {
   const pos = [0, 0, 0];
   let yaw = -Math.PI / 2, pitch = 0;       // looking down -Z
   const keys = new Set();
   let dragging = false, lastX = 0, lastY = 0;
   const dir = [0, 0, -1];
   const view = new Float32Array(16);

   const onKey = (e, down) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (down) keys.add(k); else keys.delete(k);
   };
   const kd = e => onKey(e, true), ku = e => onKey(e, false);
   const pd = e => { if (e.button === 0) { dragging = true; lastX = e.clientX; lastY = e.clientY; } };
   const pm = e => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * sensitivity;
      pitch -= (e.clientY - lastY) * sensitivity;
      pitch = Math.max(-1.55, Math.min(1.55, pitch));
      lastX = e.clientX; lastY = e.clientY;
   };
   const pu = () => { dragging = false; };
   const wh = e => { const f = dir; const d = -e.deltaY * 0.002 * speed; pos[0] += f[0] * d; pos[1] += f[1] * d; pos[2] += f[2] * d; };
   const blur = () => keys.clear();

   target.addEventListener('keydown', kd); target.addEventListener('keyup', ku);
   canvas.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
   canvas.addEventListener('wheel', wh, { passive: true }); window.addEventListener('blur', blur);

   function lookAt() {
      const f = dir;
      // right = normalize(cross(f, up)), up' = cross(right, f)
      const upW = [0, 1, 0];
      let r = [f[1] * upW[2] - f[2] * upW[1], f[2] * upW[0] - f[0] * upW[2], f[0] * upW[1] - f[1] * upW[0]];
      const rl = Math.hypot(r[0], r[1], r[2]) || 1; r = r.map(v => v / rl);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      // column-major world->camera
      view.set([
         r[0], u[0], -f[0], 0,
         r[1], u[1], -f[1], 0,
         r[2], u[2], -f[2], 0,
         -(r[0] * pos[0] + r[1] * pos[1] + r[2] * pos[2]),
         -(u[0] * pos[0] + u[1] * pos[1] + u[2] * pos[2]),
         (f[0] * pos[0] + f[1] * pos[1] + f[2] * pos[2]),
         1,
      ]);
      return { right: r, up: u };
   }

   return {
      pos, dir, view,
      /** Advance by dt seconds. */
      update(dt) {
         dir[0] = Math.cos(pitch) * Math.cos(yaw); dir[1] = Math.sin(pitch); dir[2] = Math.cos(pitch) * Math.sin(yaw);
         const { right } = lookAt();
         const v = speed * dt * (keys.has('Shift') ? 3 : 1);
         const mv = (vec, s) => { pos[0] += vec[0] * s; pos[1] += vec[1] * s; pos[2] += vec[2] * s; };
         if (keys.has('w') || keys.has('ArrowUp')) mv(dir, v);
         if (keys.has('s') || keys.has('ArrowDown')) mv(dir, -v);
         if (keys.has('d') || keys.has('ArrowRight')) mv(right, v);
         if (keys.has('a') || keys.has('ArrowLeft')) mv(right, -v);
         if (keys.has('e') || keys.has(' ')) pos[1] += v;
         if (keys.has('q') || keys.has('c')) pos[1] -= v;
         lookAt();
      },
      dispose() {
         target.removeEventListener('keydown', kd); target.removeEventListener('keyup', ku);
         canvas.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu);
         canvas.removeEventListener('wheel', wh); window.removeEventListener('blur', blur);
      }
   };
}
