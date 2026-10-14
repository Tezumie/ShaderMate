/**
 * Audio -> spectrum texture (width = fftSize/2, 8-bit, read `.r`).
 * Row 0 = frequency spectrum, row 1 = waveform (ShaderToy layout). Height is 2.
 *   { audio: 'song.mp3', fftSize: 1024 }    file (loops, starts on first user gesture)
 *   { mic: true }                            microphone input
 *   { audio: audioElement }                  an <audio> element you control yourself
 */
export function loadAudio(gl, pool, ch, { mic = false } = {}) {
   const spectro = ch.layout === 'spectrogram';                 // FragCoord.xyz u_audio: 512x512, scrolling history
   const fftSize = ch.fftSize || (spectro ? 1024 : 512);
   const AC = window.AudioContext || window.webkitAudioContext;

   return new Promise((res, rej) => {
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = ch.smoothing ?? 0.8;

      const bins = analyser.frequencyBinCount;
      const wave = new Uint8Array(fftSize);
      // ShaderToy layout: bins x 2 (row 0 spectrum, row 1 waveform), LUMINANCE.
      // Spectrogram layout: bins x bins RGB, row 0 = newest (R weighted FFT, G waveform, B raw FFT), older rows above.
      const H = spectro ? bins : 2;
      const chans = spectro ? 3 : 1;
      const data = new Uint8Array(bins * H * chans);
      const rawFFT = spectro ? new Uint8Array(bins) : null;
      let rawAnalyser = null;
      if (spectro) { rawAnalyser = ctx.createAnalyser(); rawAnalyser.fftSize = fftSize; rawAnalyser.smoothingTimeConstant = 0; }

      const tex = gl.createTexture();
      const fmt = spectro ? gl.RGB : gl.LUMINANCE;
      const upload = () => {
         gl.bindTexture(gl.TEXTURE_2D, tex);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
         gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
         gl.texImage2D(gl.TEXTURE_2D, 0, fmt, bins, H, 0, fmt, gl.UNSIGNED_BYTE, data);
         gl.bindTexture(gl.TEXTURE_2D, null);
      };
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      upload();

      let getTime = () => ctx.currentTime;
      let cleanup = () => { };

      const finish = () => {
         const resume = () => { if (ctx.state === 'suspended') ctx.resume(); };
         resume();
         window.addEventListener('pointerdown', resume, { once: true });
         window.addEventListener('keydown', resume, { once: true });
         res({
            texId: pool.add(tex, 'texture2D'),
            width: bins, height: H,
            analyser, context: ctx,
            getTime,
            update() {
               if (spectro) {
                  const row = bins * 3;
                  data.copyWithin(row, 0, data.length - row);        // scroll history up one row
                  analyser.getByteFrequencyData(rawFFT);               // smoothed ("weighted") spectrum
                  analyser.getByteTimeDomainData(wave);
                  for (let i = 0; i < bins; i++) { data[i * 3] = rawFFT[i]; data[i * 3 + 1] = wave[i * 2]; }
                  rawAnalyser.getByteFrequencyData(rawFFT);            // unsmoothed
                  for (let i = 0; i < bins; i++) data[i * 3 + 2] = rawFFT[i];
               } else {
                  analyser.getByteFrequencyData(data.subarray(0, bins));
                  analyser.getByteTimeDomainData(wave);
                  data.set(wave.subarray(0, bins), bins);
               }
               upload();
            },
            dispose() { cleanup(); ctx.close && ctx.close(); }
         });
      };

      if (mic) {
         navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
            const src = ctx.createMediaStreamSource(stream);
            src.connect(analyser); // not connected to destination: no feedback loop
            if (rawAnalyser) src.connect(rawAnalyser);
            cleanup = () => stream.getTracks().forEach(t => t.stop());
            finish();
         }).catch(rej);
         return;
      }

      const url = ch.audio || ch.audioFFT;
      const audio = url instanceof HTMLMediaElement ? url : new Audio();
      const owned = audio !== url;
      if (owned) Object.assign(audio, { src: url, crossOrigin: 'anonymous', loop: ch.loop !== false, autoplay: true });
      getTime = () => audio.currentTime;

      const connect = () => {
         const src = ctx.createMediaElementSource(audio);
         src.connect(analyser);
         if (rawAnalyser) src.connect(rawAnalyser);
         analyser.connect(ctx.destination);
         if (owned) {
            const go = () => { if (ctx.state === 'suspended') ctx.resume(); audio.play().catch(() => { }); };
            go();
            window.addEventListener('pointerdown', go, { once: true });
            window.addEventListener('keydown', go, { once: true });
            cleanup = () => { audio.pause(); audio.removeAttribute('src'); audio.load(); };
         }
         finish();
      };
      if (audio.readyState >= 3) connect();
      else {
         audio.addEventListener('canplay', connect, { once: true });
         audio.addEventListener('error', () => rej(new Error(`Failed to load audio "${url}"`)), { once: true });
         if (owned) audio.load();
      }
   });
}
