import { makeTexture2D } from './image.js';

/** Retry media playback on the first user gesture when autoplay is blocked. */
export function playOnGesture(media) {
   const p = media.play && media.play();
   if (p && p.catch) {
      p.catch(() => {
         const go = () => { media.play().catch(() => { }); };
         window.addEventListener('pointerdown', go, { once: true });
         window.addEventListener('keydown', go, { once: true });
      });
   }
}

/** Video file -> live texture. `{ video: 'clip.mp4', muted, loop }` */
export function loadVideo(gl, pool, url, params = {}, env = {}) {
   return new Promise((res, rej) => {
      const video = document.createElement('video');
      Object.assign(video, {
         src: url, crossOrigin: 'anonymous',
         loop: params.loop !== false, muted: params.muted !== false, playsInline: true, autoplay: true
      });
      video.addEventListener('error', () => rej(new Error(`Failed to load video "${url}"`)), { once: true });
      video.addEventListener('canplay', () => {
         playOnGesture(video);
         const wrapper = makeTexture2D(gl, pool, video, video.videoWidth, video.videoHeight,
            { ...params, flipY: params.flipY === undefined ? true : params.flipY }, env, { dynamic: true });
         wrapper.getTime = () => video.currentTime;
         wrapper.media = video;
         wrapper.dispose = () => { video.pause(); video.removeAttribute('src'); video.load(); };
         res(wrapper);
      }, { once: true });
      video.load();
   });
}

/** Webcam -> live texture. `{ camera: true }` or `{ camera: { facingMode: 'user' } }` */
export function loadCamera(gl, pool, params = {}, env = {}) {
   const constraints = typeof params.camera === 'object' ? params.camera : { facingMode: 'user' };
   return navigator.mediaDevices.getUserMedia({ video: constraints, audio: false }).then(stream => new Promise(res => {
      const video = document.createElement('video');
      Object.assign(video, { srcObject: stream, muted: true, playsInline: true, autoplay: true });
      video.addEventListener('loadedmetadata', () => {
         video.play().catch(() => { });
         const wrapper = makeTexture2D(gl, pool, video, video.videoWidth, video.videoHeight,
            { ...params, flipY: params.flipY === undefined ? true : params.flipY }, env, { dynamic: true });
         wrapper.media = video;
         wrapper.dispose = () => { video.pause(); stream.getTracks().forEach(t => t.stop()); };
         res(wrapper);
      }, { once: true });
   }));
}
