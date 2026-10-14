/** 'clamp' (default) | 'repeat' | 'mirror' */
export function wrapMode(gl, wrap) {
   if (wrap === 'repeat') return gl.REPEAT;
   if (wrap === 'mirror' || wrap === 'mirrored') return gl.MIRRORED_REPEAT;
   return gl.CLAMP_TO_EDGE;
}

/** 'linear' (default) | 'nearest' */
export function filterMode(gl, filter) {
   return filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
}
