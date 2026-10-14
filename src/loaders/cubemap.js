import { wrapMode, filterMode } from '../gl/params.js';

const FACE_NAMES = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

/** urls: [posx, negx, posy, negy, posz, negz] */
export function loadCubeMap(gl, pool, urls, params = {}) {
   return new Promise((res, rej) => {
      if (!Array.isArray(urls) || urls.length !== 6) return rej(new Error('cubemap needs an array of 6 URLs'));

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      const wrap = wrapMode(gl, params.wrap);
      const filter = filterMode(gl, params.filter);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrap);

      const faces = [
         gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
         gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
         gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
      ];
      let loaded = 0, w = 0, h = 0, failed = false;

      urls.forEach((u, i) => {
         const img = new Image();
         img.crossOrigin = 'anonymous';
         img.onload = () => {
            if (failed) return;
            if (!w) { w = img.width; h = img.height; }
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(faces[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            if (++loaded === 6) {
               if (params.mipmap) gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
               gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
               res({ texId: pool.add(tex, 'textureCube'), width: w, height: h, cubemap: true, update() { } });
            }
         };
         img.onerror = () => {
            if (failed) return;
            failed = true;
            gl.deleteTexture(tex);
            rej(new Error(`Failed to load cubemap face ${FACE_NAMES[i]}: "${u}"`));
         };
         img.src = u;
      });
   });
}
