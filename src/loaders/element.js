import { makeTexture2D } from './image.js';

const isCanvas = el => typeof HTMLCanvasElement !== 'undefined' && el instanceof HTMLCanvasElement;
const isVideo = el => typeof HTMLVideoElement !== 'undefined' && el instanceof HTMLVideoElement;

/**
 * Use an existing element as a texture: <canvas>, <video>, <img>, ImageBitmap.
 * Canvases and videos are re-uploaded every frame (set `dynamic: false` to upload once).
 * Great for feeding a p5 / three.js / 2D canvas into a shader:  channels: [myCanvas]
 */
export function loadElement(gl, pool, el, params = {}, env = {}) {
   const w = el.videoWidth || el.naturalWidth || el.width || 1;
   const h = el.videoHeight || el.naturalHeight || el.height || 1;
   const live = isCanvas(el) || isVideo(el);
   const dynamic = params.dynamic === undefined ? live : !!params.dynamic;
   const wrapper = makeTexture2D(gl, pool, el, w, h, params, env, { dynamic, flipDefault: live });
   if (isVideo(el)) wrapper.getTime = () => el.currentTime;
   // keep the reported size in sync with a canvas that is resized later
   if (dynamic) {
      const base = wrapper.update;
      wrapper.update = () => {
         wrapper.width = el.videoWidth || el.naturalWidth || el.width || 1;
         wrapper.height = el.videoHeight || el.naturalHeight || el.height || 1;
         base();
      };
   }
   return Promise.resolve(wrapper);
}

/** Wrap a WebGLTexture the user created elsewhere (same GL context). */
export function wrapTexture(gl, pool, ch) {
   const id = pool.add(ch.texture, ch.cube ? 'textureCube' : 'texture2D');
   pool.ref(id); // never deleted by us: the user owns it
   return Promise.resolve({ texId: id, width: ch.width || 1, height: ch.height || 1, cubemap: !!ch.cube, update() { } });
}
