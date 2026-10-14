/**
 * Screenshots and video capture. `renderNow()` draws a fresh frame synchronously, so these
 * work without preserveDrawingBuffer (the pixels are read in the same task as the draw).
 */
export function createCapture(canvas, renderNow) {
   function screenshot(type = 'image/png', quality) {
      renderNow();
      return canvas.toDataURL(type, quality);
   }

   function toBlob(type = 'image/png', quality) {
      renderNow();
      return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), type, quality));
   }

   async function download(filename = 'shadermate.png', type, quality) {
      if (!type) type = /\.jpe?g$/i.test(filename) ? 'image/jpeg' : /\.webp$/i.test(filename) ? 'image/webp' : 'image/png';
      const blob = await toBlob(type, quality);
      saveBlob(blob, filename);
   }

   /**
    * Record the canvas to a WebM (or whatever the browser supports).
    *   const rec = sm.record({ fps: 60 });  …  const blob = await rec.stop();
    *   await sm.record({ duration: 5000, download: 'loop.webm' });
    */
   function record({ fps = 60, mimeType, bitsPerSecond = 8_000_000, duration = 0, download: dl } = {}) {
      if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) throw new Error('MediaRecorder not supported');
      const stream = canvas.captureStream(fps);
      const type = mimeType || ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
         .find(t => MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: bitsPerSecond });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType })); });
      rec.start(100);

      const handle = {
         recorder: rec,
         stop() { if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(t => t.stop()); return done; },
         done
      };
      if (duration > 0) {
         const finished = new Promise(res => setTimeout(() => res(handle.stop()), duration));
         if (dl) return finished.then(blob => { saveBlob(blob, typeof dl === 'string' ? dl : 'shadermate.webm'); return blob; });
         return finished;
      }
      return handle;
   }

   return { screenshot, toBlob, download, record };
}

export function saveBlob(blob, filename) {
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url; a.download = filename;
   document.body.appendChild(a);
   a.click();
   a.remove();
   setTimeout(() => URL.revokeObjectURL(url), 1000);
}
