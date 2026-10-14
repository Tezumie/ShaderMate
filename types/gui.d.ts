import type { ShaderInstance } from './index';
import type GUI from 'lil-gui';

export interface GuiOptions {
   title?: string;
   container?: HTMLElement;
   width?: number;
   open?: boolean;
   /** Playback folder (play/pause, time scale, screenshot, record). Default true. */
   controls?: boolean;
   /** true (all), false, or a list of uniform names to expose. */
   uniforms?: boolean | string[];
   /** false = leave lil-gui's default look; an object overrides parts of the theme. Defaults to the instance's theme. */
   theme?: false | Partial<import('./index').Theme>;
}

export function createGui(sm: ShaderInstance, opts?: GuiOptions): Promise<GUI>;
export function applyTheme(gui: GUI, theme: import('./index').Theme): GUI;
export { GUI };
