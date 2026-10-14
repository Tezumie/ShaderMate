/* global __VERSION__ */
// __VERSION__ is injected by esbuild (see esbuild.config.mjs); falls back when running src/ directly.
export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '2.0.0-dev';
export const MAX_CHANNELS = 4;
export const DEFAULT_CANVAS_ID = 'glcanvas';
