// Type definitions for shadermate

export type UniformTypeName =
   | 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'ivec2' | 'ivec3' | 'ivec4' | 'bool' | 'bvec2' | 'bvec3' | 'bvec4'
   | 'uint' | 'uvec2' | 'uvec3' | 'uvec4' | 'mat2' | 'mat3' | 'mat4'
   | 'float[]' | 'vec2[]' | 'vec3[]' | 'vec4[]' | 'int[]'
   | '1f' | '2f' | '3f' | '4f' | '1i' | '2i' | '3i' | '4i' | '1fv' | '2fv' | '3fv' | '4fv' | 'Matrix2fv' | 'Matrix3fv' | 'Matrix4fv'
   | (string & {});

export type UniformValue = number | boolean | number[] | Float32Array | Int32Array | Uint32Array;

export interface UniformSpec {
   value: UniformValue;
   /** Optional; inferred from the shader when omitted. GLSL names ('vec3') or WebGL shorthand ('3f'). */
   type?: UniformTypeName;
   transpose?: boolean;
   // GUI hints (shadermate/gui)
   min?: number; max?: number; step?: number; label?: string; color?: boolean; hidden?: boolean;
}
export type UniformMap = Record<string, UniformValue | UniformSpec>;

export type WrapMode = 'clamp' | 'repeat' | 'mirror';
export type FilterMode = 'linear' | 'nearest';

export interface ChannelParams {
   wrap?: WrapMode; filter?: FilterMode; flipY?: boolean; mipmap?: boolean; premultiplyAlpha?: boolean;
}
export type ChannelSource =
   | string                                                  // pass name or image URL
   | HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | ImageBitmap | WebGLTexture
   | ({ pass: string; buffer?: 'prev' | 'current' } & ChannelParams)
   | ({ id: string; buffer?: 'prev' | 'current' } & ChannelParams)
   | ({ url: string } & ChannelParams)
   | ({ image: string } & ChannelParams)
   | ({ video: string; loop?: boolean; muted?: boolean } & ChannelParams)
   | ({ audio: string | HTMLMediaElement; fftSize?: number; smoothing?: number; loop?: boolean; layout?: 'shadertoy' | 'spectrogram' })
   | ({ mic: true; fftSize?: number; smoothing?: number; layout?: 'shadertoy' | 'spectrogram' })   // 'spectrogram' = FragCoord.xyz u_audio (512x512 RGB history)
   | ({ keyboard: true | { target: EventTarget } })      // 256x3 ShaderToy keyboard texture
   | ({ camera: true | MediaTrackConstraints } & ChannelParams)
   | ({ cubemap: [string, string, string, string, string, string] } & ChannelParams)
   | ({ element: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | ImageBitmap; dynamic?: boolean } & ChannelParams)
   | ({ texture: WebGLTexture; width?: number; height?: number; cube?: boolean })
   | null;

export type PassSize = 'screen' | 'half' | 'quarter' | number | [number, number] | { width: number; height: number };

export interface PassConfig {
   name?: string;
   /** GLSL source or a URL. */
   shader?: string; src?: string;
   size?: PassSize;
   screen?: boolean;
   pingpong?: boolean;
   float?: boolean | 'half' | 'full' | 16 | 32;
   wrap?: WrapMode; filter?: FilterMode; depth?: boolean;
   channels?: ChannelSource[];
   /** Sources for named `sampler2D` uniforms (anything that isn't iChannelN): `{ u_tex: 'img.png', u_prev: { pass: 'blur' } }`. */
   samplers?: Record<string, ChannelSource>;
   /** Draw this pass N times per frame (FragCoord.xyz recursion); `u_recursion` / `u_max_recursion` tell the shader which. */
   iterations?: number;
   uniforms?: UniformMap;
   defines?: Define | Define[];
}
export type Define = string | Record<string, string | number | boolean | undefined>;

export interface InjectOptions { header?: boolean; builtins?: boolean; uniforms?: boolean; defines?: boolean; mainWrap?: boolean }

export interface PointerOptions { target?: 'window' | 'canvas' | Element; smooth?: number; touch?: boolean }

export interface ShaderOptions {
   canvas?: HTMLCanvasElement | string;
   gl?: WebGLRenderingContext | WebGL2RenderingContext;
   shader?: string;
   /** Single-shader form only: inputs for `iChannel0..3`. With `passes`, put `channels` on each pass. */
   channels?: ChannelSource[];
   passes?: string | PassConfig | Array<string | PassConfig>;
   uniforms?: UniformMap;
   defines?: Define | Define[];
   includes?: Record<string, string>;
   /** GLSL (text or URL) prepended to every pass — ShaderToy's "Common" tab. */
   common?: string;
   /** Named-sampler sources shared by all passes (see PassConfig.samplers). */
   samplers?: Record<string, ChannelSource>;
   /** Which conventions to assume. 'auto' detects FragCoord.xyz style (`void main` + `fragColor`) and ShaderToy style (`mainImage`). */
   dialect?: 'auto' | 'fragcoord' | 'shadertoy' | 'shadermate';
   /** Fly camera for `u_camera_pos/dir/view` (created automatically when a pass uses them). */
   camera?: { speed?: number; sensitivity?: number; target?: EventTarget };

   // sizing
   size?: 'canvas' | 'window' | [number, number] | { width: number; height: number; fit?: 'contain' | 'cover' | 'fill' };
   aspect?: number | string | [number, number];
   fit?: 'contain' | 'cover' | 'fill';
   pixelRatio?: 'auto' | number;
   maxPixelRatio?: number;
   scale?: number;

   // playback
   autoplay?: boolean;
   pauseWhenHidden?: boolean;
   renderWhilePaused?: boolean;
   maxFps?: number;
   loop?: number;
   time?: number;
   timeScale?: number;
   fixedDelta?: number;
   maxDelta?: number;

   // context
   webgl?: 'auto' | 1 | 2;
   alpha?: boolean; premultipliedAlpha?: boolean; preserveDrawingBuffer?: boolean; antialias?: boolean;
   powerPreference?: 'default' | 'high-performance' | 'low-power';
   contextAttributes?: WebGLContextAttributes;
   background?: string | [number, number, number, number?];

   // input / dev
   pointer?: boolean | PointerOptions;
   stats?: boolean | 'key' | 'visible';
   statsKey?: string | null;
   statsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
   errorOverlay?: boolean | 'auto';
   /** Colours/fonts for ShaderMate's own UI (stats, error overlay, GUI addon). Partial overrides of the default dark theme. */
   theme?: Partial<Theme>;
   showExpandedOnError?: boolean;
   strictUniforms?: boolean;
   warnMissingUniforms?: boolean;
   autoSetup?: boolean;
   inject?: InjectOptions;

   // callbacks
   onReady?: (sm: ShaderInstance) => void;
   onFrame?: (info: FrameInfo) => void;
   onError?: (err: ShaderMateError) => void;
}

export interface Theme {
   font: string; mono: string; bg: string; bgAlt: string; raised: string; hover: string; border: string;
   text: string; textStrong: string; label: string; accent: string; number: string; string: string;
   red: string; redSoft: string; redText: string; radius: string; shadow: string;
}

export interface FrameInfo { time: number; frame: number; dt: number; fps: number }

export interface ShaderError {
   line: number; message: string; source: string; physical: number;
}
export class ShaderMateError extends Error {
   pass?: string; stage?: string; log?: string; errors?: ShaderError[]; source?: string;
}

export type EaseName = 'linear' | 'inQuad' | 'outQuad' | 'inOutQuad' | 'inCubic' | 'outCubic' | 'inOutCubic' | 'outExpo' | 'outBack' | 'outElastic';
export interface TweenOptions { duration?: number; delay?: number; ease?: EaseName | ((t: number) => number); pass?: string }

export interface RecordOptions { fps?: number; mimeType?: string; bitsPerSecond?: number; duration?: number; download?: boolean | string }
export interface RecordHandle { recorder: MediaRecorder; stop(): Promise<Blob>; done: Promise<Blob> }

export interface PassObject {
   name: string; index: number; cfg: PassConfig & { channels: ChannelSource[]; uniforms: UniformMap };
   source: string; compiled: string;
}

export type EventName = 'load' | 'error' | 'beforeFrame' | 'afterFrame' | 'resize' | 'play' | 'pause' | 'shader' | 'visibility' | 'contextlost' | 'contextrestored' | 'destroy';

export interface PointerState { x: number; y: number; clickX: number; clickY: number; down: boolean; over: boolean; uvX: number; uvY: number }

export interface ShaderInstance {
   readonly version: string;
   readonly canvas: HTMLCanvasElement;
   readonly gl: WebGLRenderingContext | WebGL2RenderingContext;
   readonly isWebGL2: boolean;
   /** Fly camera (WASD + drag), present once a pass uses `u_camera_*`. */
   readonly camera: { pos: number[]; dir: number[]; view: Float32Array } | null;
   readonly theme: Partial<Theme> | undefined;
   readonly uniforms: UniformMap;
   readonly passes: PassObject[];
   readonly ready: Promise<ShaderInstance>;
   readonly loaded: boolean;
   readonly error: ShaderMateError | null;

   play(): this; pause(): this; toggle(): this;
   readonly playing: boolean;
   step(frames?: number): this;
   render(): void;
   destroy(): void; dispose(): void;

   time: number; readonly frame: number; timeScale: number; maxFps: number; loop: number;
   seek(t: number): this;
   setFixedDelta(dt: number): this;

   set(name: string, value: UniformValue, pass?: string): this;
   set(values: Record<string, UniformValue>, pass?: string): this;
   get(name: string, pass?: string): UniformValue | undefined;
   tween(name: string, to: number | number[], opts?: TweenOptions): Promise<boolean>;
   setUniform: ShaderInstance['set'];
   getUniform: ShaderInstance['get'];

   setShader(src: string, pass?: string): Promise<void>;
   setChannel(index: number, source: ChannelSource, pass?: string): Promise<void>;
   getPass(name: string): PassObject | null;
   getTexture(pass?: string): WebGLTexture | null;
   readPixels(opts?: { pass?: string; x?: number; y?: number; width?: number; height?: number }): { data: Uint8Array; width: number; height: number };

   resize(): void;
   setSize(width: number, height: number): this;
   readonly width: number; readonly height: number;
   readonly pointer: PointerState;
   domToShader(clientX: number, clientY: number): [number, number];
   domToUV(clientX: number, clientY: number): [number, number];

   screenshot(type?: string, quality?: number): string;
   toBlob(type?: string, quality?: number): Promise<Blob>;
   download(filename?: string, type?: string, quality?: number): Promise<void>;
   record(opts?: RecordOptions & { duration?: 0 }): RecordHandle;
   record(opts: RecordOptions & { duration: number }): Promise<Blob>;

   on(event: EventName | string, fn: (data?: any) => void): () => void;
   off(event: EventName | string, fn: (data?: any) => void): void;
   once(event: EventName | string, fn: (data?: any) => void): () => void;

   stats: { show(visible?: boolean): void; toggle(): void };
}

export function createShader(options: ShaderOptions): ShaderInstance;
export function createShader(shaderOrPasses: string | Array<string | PassConfig>, options?: ShaderOptions): ShaderInstance;
export function glsl(strings: TemplateStringsArray, ...values: unknown[]): string;
export function resolveUniformType(type: string): { kind: 'f' | 'i' | 'u' | 'm'; n: number } | null;
export function assembleFragment(src: string, opts?: { isGL2?: boolean; defines?: Define[]; enableDerivatives?: boolean; inject?: InjectOptions; channelTypes?: Array<'2D' | 'cube' | null> }): string;
export function resolveIncludes(src: string, opts: { loader: (path: string) => string | Promise<string>; throwOnError?: boolean }): Promise<string>;
export const VERSION: string;
export const EASES: Record<EaseName, (t: number) => number>;
export const BUILTIN_UNIFORMS: Record<string, string>;

/** The <script> build exposes the module namespace as `window.ShaderMate`. */
declare global {
   interface Window {
      ShaderMate: {
         createShader: typeof createShader;
         glsl: typeof glsl;
         resolveUniformType: typeof resolveUniformType;
         assembleFragment: typeof assembleFragment;
         resolveIncludes: typeof resolveIncludes;
         VERSION: string;
         EASES: typeof EASES;
         BUILTIN_UNIFORMS: typeof BUILTIN_UNIFORMS;
         ShaderMateError: typeof ShaderMateError;
         /** Added by dist/shadermate-gui.js */
         createGui?: (sm: ShaderInstance, opts?: import('./gui').GuiOptions) => Promise<any>;
      };
   }
}
