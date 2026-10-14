/** Reference-counted store for GL objects so shared resources are freed exactly once. */
export class RefPool {
   constructor(gl) {
      this.gl = gl;
      this._items = new Map(); // id -> { obj, count, type }
      this._nextId = 1;
   }

   add(obj, type) {
      const id = this._nextId++;
      this._items.set(id, { obj, count: 1, type });
      return id;
   }

   ref(id) {
      const it = this._items.get(id);
      if (it) it.count++;
      return id;
   }

   /** Returns the raw GL object for an id (or null). */
   get(id) {
      const it = this._items.get(id);
      return it ? it.obj : null;
   }

   unref(id) {
      const it = this._items.get(id);
      if (!it) return;
      it.count--;
      if (it.count <= 0) this._destroy(id, it);
   }

   _destroy(id, it) {
      const { obj, type } = it;
      const gl = this.gl;
      switch (type) {
         case 'texture2D':
         case 'textureCube': gl.deleteTexture(obj); break;
         case 'fbo': gl.deleteFramebuffer(obj); break;
         case 'buffer': gl.deleteBuffer(obj); break;
         case 'program': gl.deleteProgram(obj); break;
      }
      this._items.delete(id);
   }

   /** Destroy everything regardless of refcount. */
   dispose() {
      for (const [id, it] of [...this._items]) this._destroy(id, it);
   }
}
