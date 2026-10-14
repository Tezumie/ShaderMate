import { wrapMode, filterMode } from './params.js';
import { warnOnce } from '../utils/util.js';

function chooseFormat(gl, isGL2, ext, opts) {
   let ifmt = isGL2 ? gl.RGBA8 : gl.RGBA;
   const fmt = gl.RGBA;
   let type = gl.UNSIGNED_BYTE;

   if (opts.float === 'full' || opts.float === 32) {
      if (isGL2) { ifmt = gl.RGBA32F; type = gl.FLOAT; }
      else if (ext.OES_texture_float) type = gl.FLOAT;
   } else if (opts.float) {
      if (isGL2) { ifmt = gl.RGBA16F; type = gl.HALF_FLOAT; }
      else if (ext.OES_texture_half_float) type = ext.OES_texture_half_float.HALF_FLOAT_OES;
      else if (ext.OES_texture_float) type = gl.FLOAT;
   }
   return { ifmt, fmt, type };
}

function isRenderable(gl, ifmt, fmt, type) {
   const tex = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, tex);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, 4, 4, 0, fmt, type, null);
   const fbo = gl.createFramebuffer();
   gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
   const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   gl.deleteFramebuffer(fbo);
   gl.deleteTexture(tex);
   return ok;
}

/** Create a colour (+ optional depth) render target. Falls back to 8-bit if float isn't renderable. */
export function createTarget(gl, pool, w, h, opts, isGL2, ext) {
   const wanted = chooseFormat(gl, isGL2, ext, opts);
   let chosen = wanted;
   if (!isRenderable(gl, wanted.ifmt, wanted.fmt, wanted.type)) {
      warnOnce('fmt-fallback', 'Requested float format not renderable on this device; falling back to 8-bit.');
      chosen = { ifmt: isGL2 ? gl.RGBA8 : gl.RGBA, fmt: gl.RGBA, type: gl.UNSIGNED_BYTE };
   }
   // Linear filtering of float textures needs an extension; silently use nearest when unavailable.
   let filterOpt = opts.filter;
   if (chosen.type !== gl.UNSIGNED_BYTE && filterOpt !== 'nearest') {
      const linearOK = isGL2
         ? (chosen.type === gl.HALF_FLOAT || ext.OES_texture_float_linear)
         : (chosen.type === gl.FLOAT ? ext.OES_texture_float_linear : ext.OES_texture_half_float_linear);
      if (!linearOK) filterOpt = 'nearest';
   }

   const tex = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, tex);
   const wrap = wrapMode(gl, opts.wrap);
   const filter = filterMode(gl, filterOpt);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
   gl.texImage2D(gl.TEXTURE_2D, 0, chosen.ifmt, w, h, 0, chosen.fmt, chosen.type, null);

   let depthTex = null;
   if (opts.depth) {
      if (!isGL2 && !ext.WEBGL_depth_texture) {
         warnOnce('depth-tex', 'depth: true needs WebGL2 or WEBGL_depth_texture; ignoring.');
      } else {
         depthTex = gl.createTexture();
         gl.bindTexture(gl.TEXTURE_2D, depthTex);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texImage2D(gl.TEXTURE_2D, 0, isGL2 ? gl.DEPTH_COMPONENT16 : gl.DEPTH_COMPONENT,
            w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
      }
   }

   const fbo = gl.createFramebuffer();
   gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
   if (depthTex) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
   const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
   if (status !== gl.FRAMEBUFFER_COMPLETE) console.warn('[ShaderMate] Framebuffer incomplete:', status);
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   gl.bindTexture(gl.TEXTURE_2D, null);

   return {
      texId: pool.add(tex, 'texture2D'),
      depthId: depthTex ? pool.add(depthTex, 'texture2D') : null,
      fboId: pool.add(fbo, 'fbo'),
      width: w,
      height: h,
      fmt: chosen
   };
}

export function deleteTarget(pool, t) {
   if (!t) return;
   pool.unref(t.texId);
   if (t.depthId) pool.unref(t.depthId);
   pool.unref(t.fboId);
}

/** Resolve a pass `size` option against the canvas size. */
export function resolvePassSize(size, cw, ch) {
   const c = n => Math.max(1, Math.round(n));
   if (size == null || size === 'screen' || size === 'canvas') return [cw, ch];
   if (size === 'half') return [c(cw / 2), c(ch / 2)];
   if (size === 'quarter') return [c(cw / 4), c(ch / 4)];
   if (typeof size === 'number') return [c(cw * size), c(ch * size)];   // scale factor
   if (Array.isArray(size)) return [c(size[0]), c(size[1])];
   if (typeof size === 'object' && size.width && size.height) return [c(size.width), c(size.height)];
   return [cw, ch];
}
