---
title: Playback & timing
group: Guide
order: 16
description: Play, pause, seek, loop, cap the frame rate and drive frames yourself.
---

# Playback & timing

```js
sm.play(); sm.pause(); sm.toggle(); sm.playing
sm.time = 0;  sm.seek(3);  sm.timeScale = 0.5;  sm.frame
sm.maxFps = 30;  sm.loop = 4
sm.step(n);      // advance n frames while paused
sm.setFixedDelta(1 / 60);   // same as the fixedDelta option
sm.render();     // draw one frame now, without advancing time
```

## Starting state

```js
createShader({ shader, autoplay: false });          // draws one frame, waits for sm.play()
createShader({ shader, time: 12 });                 // start at t = 12 s
```

## Loops

`loop: 4` wraps `u_time` back to 0 every four seconds, so a shader whose motion is periodic in 4 s repeats seamlessly. This is what you want for recordings.

## Frame rate and cost

- `maxFps: 30` halves the work on a 60 Hz display, and is invisible for slow ambient motion.
- `pauseWhenHidden` (default on) stops rendering for hidden tabs and for canvases scrolled out of view, so a page with several shaders only pays for the ones you can see.
- `renderWhilePaused: true` keeps drawing while paused, for shaders that react to the pointer but shouldn't advance time.

## Deterministic frames

For exports and tests, take the clock away from the wall:

```js
const sm = createShader({ shader, autoplay: false, fixedDelta: 1 / 60 });
for (let i = 0; i < 120; i++) { sm.step(1); frames.push(await sm.toBlob()); }
```

`fixedDelta` makes each step advance exactly that many seconds. `maxDelta` (default 0.1 s) clamps a long frame so animations don't jump after a tab was in the background.

## Your own loop

```js
const sm = createShader({ shader, autoplay: false });
function tick(t) { sm.set('u_x', Math.sin(t / 1000)); sm.render(); requestAnimationFrame(tick); }
requestAnimationFrame(tick);
```

## Reduced motion

Honour the user's setting by starting paused and drawing one still frame:

```js
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sm = createShader({ canvas, shader, autoplay: !reduced });
if (reduced) sm.render();
```
