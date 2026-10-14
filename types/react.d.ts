import type { CanvasHTMLAttributes, DependencyList, ForwardRefExoticComponent, RefAttributes, RefObject } from 'react';
import type { FrameInfo, PassConfig, ShaderMateError, ShaderInstance, ShaderOptions, UniformMap } from './index';

export function useShader(options: ShaderOptions, deps?: DependencyList): [RefObject<HTMLCanvasElement>, ShaderInstance | null];

export interface ShaderCanvasProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'ref'> {
   shader?: string;
   passes?: Array<string | PassConfig>;
   uniforms?: UniformMap;
   options?: Omit<ShaderOptions, 'canvas' | 'shader' | 'passes' | 'uniforms'>;
   onReady?: (sm: ShaderInstance) => void;
   onFrame?: (info: FrameInfo) => void;
   onError?: (err: ShaderMateError) => void;
   /** Extra values that should trigger a rebuild when changed. */
   deps?: DependencyList;
}

export const ShaderCanvas: ForwardRefExoticComponent<ShaderCanvasProps & RefAttributes<ShaderInstance | null>>;
