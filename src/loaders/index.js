import { loadImage } from './image.js';
import { loadCubeMap } from './cubemap.js';
import { loadVideo, loadCamera } from './video.js';
import { loadAudio } from './audio.js';
import { loadElement, wrapTexture } from './element.js';
import { loadKeyboard } from './keyboard.js';

/**
 * Load one external (non-pass) channel. Resolves to a wrapper
 * { texId, width, height, update(), cubemap?, getTime?, dispose? } or rejects.
 */
export function loadChannel(gl, pool, ch, env) {
   if (ch.texture) return wrapTexture(gl, pool, ch);
   if (ch.element) return loadElement(gl, pool, ch.element, ch, env);
   if (ch.url) return loadImage(gl, pool, ch.url, ch, env);
   if (ch.video) return loadVideo(gl, pool, ch.video, ch, env);
   if (ch.camera) return loadCamera(gl, pool, ch, env);
   if (ch.mic) return loadAudio(gl, pool, ch, { mic: true });
   if (ch.keyboard) return loadKeyboard(gl, pool, ch);
   if (ch.audio || ch.audioFFT) return loadAudio(gl, pool, ch);
   if (ch.cubemap) return loadCubeMap(gl, pool, ch.cubemap, ch);
   return Promise.reject(new Error('Unrecognised channel: ' + JSON.stringify(ch)));
}

/** Sampler type a channel will need in GLSL. */
export function channelSamplerType(ch) {
   if (!ch) return null;
   return ch.cubemap || (ch.texture && ch.cube) ? 'cube' : '2D';
}
