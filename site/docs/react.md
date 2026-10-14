---
title: React
group: Integrations
order: 30
description: The ShaderCanvas component and useShader hook.
---

# React

```bash
npm i shadermate react react-dom
```

## `<ShaderCanvas>`

```jsx
import { ShaderCanvas } from 'shadermate/react';

export function Hero({ hover }) {
  return (
    <ShaderCanvas
      shader={frag}
      uniforms={{ u_hover: hover ? 1 : 0 }}
      options={{ maxFps: 60, pointer: { smooth: 0.15 } }}
      style={{ width: '100%', height: '60vh' }}
      onReady={sm => sm.tween('u_in', 1, { duration: 800 })}
    />
  );
}
```

| Prop | Meaning |
| --- | --- |
| `shader` or `passes` | What to render. A change rebuilds the instance. |
| `uniforms` | Applied live on every render, without rebuilding. |
| `options` | Any other [option](../options/) (everything except `canvas`, `shader`, `passes`, `uniforms`). |
| `onReady`, `onFrame`, `onError` | Callbacks. |
| `deps` | Extra values that should trigger a rebuild. |
| anything else | Passed to the `<canvas>` (`className`, `style`, `aria-*` …). |

A forwarded `ref` receives the instance:

```jsx
const ref = useRef(null);
<ShaderCanvas ref={ref} shader={frag} />
// ref.current.pause()
```

## `useShader`

When you need your own canvas element:

```jsx
import { useShader } from 'shadermate/react';

function Panel() {
  const [canvasRef, sm] = useShader({ shader: frag, uniforms: { u_glow: 1 } }, []);
  return <canvas ref={canvasRef} onPointerEnter={() => sm?.tween('u_glow', 2, { duration: 200 })} />;
}
```

`sm` is `null` until the instance exists. The second argument is a dependency list that triggers a rebuild, like `useEffect`.

## Notes

- The instance is created in an effect and destroyed on unmount, so it is safe under React 18 strict mode and with hot reloading.
- Rendering happens outside React: changing a uniform does not re-render your components.
- In frameworks that render on the server (Next.js, Remix), use these components in client components only. Nothing touches `window` until the effect runs.
