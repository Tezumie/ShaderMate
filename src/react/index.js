// React bindings (optional entry: `shadermate/react`).
//
//   import { ShaderCanvas } from 'shadermate/react';
//   <ShaderCanvas shader={frag} uniforms={{ u_hover: hover ? 1 : 0 }} style={{ width: '100%', height: '60vh' }} />
//
//   const [ref, sm] = useShader({ shader: frag }, []);   // bring your own <canvas ref={ref}>

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createShader } from '../index.js';

/**
 * Create an instance on a canvas you render yourself. Re-creates when `deps` change.
 * Returns [canvasRef, instance | null].
 */
export function useShader(options, deps = []) {
   const ref = useRef(null);
   const [sm, setSm] = useState(null);
   const latest = useRef(options);
   latest.current = options;

   useEffect(() => {
      if (!ref.current) return undefined;
      const inst = createShader({ ...latest.current, canvas: ref.current });
      setSm(inst);
      return () => { inst.destroy(); setSm(null); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, deps);

   // live uniform updates without a rebuild
   useEffect(() => { if (sm && options.uniforms) sm.set(options.uniforms); });
   return [ref, sm];
}

/**
 * Drop-in canvas. Props: shader | passes, uniforms (live), options (anything createShader takes),
 * onReady(sm), onFrame(info), onError(err), plus any <canvas> props (className, style…).
 * The forwarded ref receives the ShaderMate instance.
 */
export const ShaderCanvas = forwardRef(function ShaderCanvas(
   { shader, passes, uniforms, options, onReady, onFrame, onError, deps = [], ...rest }, outerRef) {
   const key = JSON.stringify([shader, passes && passes.length, ...deps]);
   const [ref, sm] = useShader({ ...options, passes: passes ?? shader, uniforms, onReady, onFrame, onError }, [key]);
   useImperativeHandle(outerRef, () => sm, [sm]);
   return createElement('canvas', { ref, ...rest });
});

