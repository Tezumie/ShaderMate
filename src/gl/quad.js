/** Full-screen two-triangle quad. One per instance (GL buffers can't be shared across contexts). */
export function createQuad(gl) {
   const buf = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buf);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
   ]), gl.STATIC_DRAW);

   return {
      /** Bind the quad to `program`'s a_position attribute (call right before drawing). */
      bind(program) {
         gl.bindBuffer(gl.ARRAY_BUFFER, buf);
         const loc = gl.getAttribLocation(program, 'a_position');
         if (loc !== -1) {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
         }
      },
      draw() { gl.drawArrays(gl.TRIANGLES, 0, 6); },
      dispose() { gl.deleteBuffer(buf); }
   };
}
