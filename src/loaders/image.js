import { wrapMode, filterMode } from '../gl/params.js';
import { isPow2, warnOnce } from '../utils/util.js';

/**
 * Upload an image/video/canvas/ImageBitmap to a new 2D texture.
 * Returns a channel wrapper: { texId, width, height, update(), dispose? }.
 */
export function makeTexture2D(gl, pool, source, w, h, params = {}, env = {}, { dynamic = false, flipDefault = false } = {}) {
   const tex = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, tex);

   const flip = params.flipY === undefined ? flipDefault : !!params.flipY;
   // WebGL1 only supports clamp + no mipmaps on non-power-of-two textures
   const npotLimited = !env.isGL2 && !(isPow2(w) && isPow2(h));
   if (npotLimited && params.wrap && params.wrap !== 'clamp') {
      warnOnce('npot-wrap', 'Non-power-of-two texture in WebGL1: forcing wrap to clamp.');
   }
   const wrap = npotLimited ? gl.CLAMP_TO_EDGE : wrapMode(gl, params.wrap);
   const mip = !!params.mipmap && !dynamic && !npotLimited;
   const filter = filterMode(gl, params.filter);
   const minFilter = mip
      ? (params.filter === 'nearest' ? gl.NEAREST_MIPMAP_NEAREST : gl.LINEAR_MIPMAP_LINEAR)
      : filter;

   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

   const upload = () => {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !!params.premultiplyAlpha);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
   };
   upload();
   if (mip) gl.generateMipmap(gl.TEXTURE_2D);
   gl.bindTexture(gl.TEXTURE_2D, null);

   return {
      texId: pool.add(tex, 'texture2D'),
      width: w,
      height: h,
      source,
      update: dynamic
         ? () => {
            if (source.readyState !== undefined && source.readyState < 2) return; // media not ready
            gl.bindTexture(gl.TEXTURE_2D, tex);
            upload();
            gl.bindTexture(gl.TEXTURE_2D, null);
         }
         : () => { }
   };
}

export function loadImage(gl, pool, url, params = {}, env = {}) {
   return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = params.crossOrigin === undefined ? 'anonymous' : params.crossOrigin;
      img.onload = () => res(makeTexture2D(gl, pool, img, img.naturalWidth, img.naturalHeight, params, env));
      img.onerror = () => rej(new Error(`Failed to load image "${url}"`));
      img.src = url;
   });
}
