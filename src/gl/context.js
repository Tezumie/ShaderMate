import { ShaderMateError } from '../utils/util.js';

export const isWebGL2 = gl =>
   typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

/**
 * options.webgl: 'auto' (default) | 2 | 1
 * options.alpha / premultipliedAlpha / preserveDrawingBuffer / antialias, plus options.contextAttributes.
 */
export function createContext(canvas, options = {}) {
   const attrs = Object.assign({
      alpha: options.alpha !== false,
      premultipliedAlpha: options.premultipliedAlpha !== false,
      preserveDrawingBuffer: !!options.preserveDrawingBuffer,
      antialias: !!options.antialias,
      powerPreference: options.powerPreference || 'default',
   }, options.contextAttributes);

   const want = options.webgl === undefined ? 'auto' : String(options.webgl);
   let gl = null;
   if (want === 'auto' || want === '2') gl = canvas.getContext('webgl2', attrs);
   if (!gl && (want === 'auto' || want === '1')) {
      gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
   }
   if (!gl) throw new ShaderMateError('WebGL not supported');
   return gl;
}

export function getExtensions(gl, isGL2) {
   const ext = {};
   if (!isGL2) {
      ext.OES_texture_float = gl.getExtension('OES_texture_float');
      ext.OES_texture_half_float = gl.getExtension('OES_texture_half_float');
      ext.OES_texture_float_linear = gl.getExtension('OES_texture_float_linear');
      ext.OES_texture_half_float_linear = gl.getExtension('OES_texture_half_float_linear');
      ext.OES_standard_derivatives = gl.getExtension('OES_standard_derivatives');
      ext.WEBGL_color_buffer_float = gl.getExtension('WEBGL_color_buffer_float');
      ext.EXT_color_buffer_half_float = gl.getExtension('EXT_color_buffer_half_float');
      ext.WEBGL_depth_texture = gl.getExtension('WEBGL_depth_texture');
      ext.EXT_shader_texture_lod = gl.getExtension('EXT_shader_texture_lod');
   } else {
      ext.EXT_color_buffer_float = gl.getExtension('EXT_color_buffer_float');
      ext.EXT_color_buffer_half_float = gl.getExtension('EXT_color_buffer_half_float');
      ext.OES_texture_float_linear = gl.getExtension('OES_texture_float_linear');
   }
   return ext;
}
