import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveUniformType, describeGLType } from '../src/uniforms/types.js';
import { applyUniformMap, uploadUniform } from '../src/uniforms/apply.js';
import { createTweens, EASES } from '../src/core/tween.js';

test('GLSL names and classic shorthand resolve to the same descriptor', () => {
   const pairs = [
      ['float', '1f'], ['vec2', '2f'], ['vec3', '3f'], ['vec4', '4f'],
      ['int', '1i'], ['ivec2', '2i'], ['ivec3', '3i'], ['ivec4', '4i'],
      ['float[]', '1fv'], ['vec2[]', '2fv'], ['vec3[]', '3fv'], ['vec4[]', '4fv'],
      ['mat3', 'Matrix3fv'], ['mat4', 'Matrix4fv'], ['uint', '1ui'], ['bool', '1i'],
   ];
   for (const [a, b] of pairs) {
      assert.ok(resolveUniformType(a), a);
      assert.deepEqual(resolveUniformType(a), resolveUniformType(b), `${a} vs ${b}`);
   }
   assert.deepEqual(resolveUniformType(' VEC3 '), { kind: 'f', n: 3 });
   assert.equal(resolveUniformType('nope'), null);
   assert.equal(resolveUniformType(undefined), null);
});

test('GL enum inference', () => {
   assert.deepEqual(describeGLType(5126), { kind: 'f', n: 1 });
   assert.deepEqual(describeGLType(35665), { kind: 'f', n: 3 });
   assert.deepEqual(describeGLType(35676), { kind: 'm', n: 4 });
   assert.equal(describeGLType(35678), undefined); // sampler2D
});

// Records every gl.* call as [name, ...args]; read them back via `gl.calls`.
function mockGL() {
   const calls = [];
   return new Proxy({ calls }, {
      get: (t, name) => (name === 'calls' ? calls : (...args) => { calls.push([name, ...args]); })
   });
}

test('uploadUniform picks the right gl call', () => {
   const gl = mockGL();
   uploadUniform(gl, 'L', { kind: 'f', n: 1 }, 0.5);
   uploadUniform(gl, 'L', { kind: 'f', n: 3 }, [1, 2, 3]);
   uploadUniform(gl, 'L', { kind: 'f', n: 2 }, 7);            // broadcast
   uploadUniform(gl, 'L', { kind: 'i', n: 1 }, true);         // bool -> int
   uploadUniform(gl, 'L', { kind: 'm', n: 4 }, [0], true);
   assert.deepEqual(gl.calls.map(c => c[0]), ['uniform1f', 'uniform3fv', 'uniform2fv', 'uniform1i', 'uniformMatrix4fv']);
   assert.deepEqual(gl.calls[2][2], [7, 7]);
   assert.equal(gl.calls[3][2], 1);
   assert.equal(gl.calls[4][2], true);
});

test('applyUniformMap: inferred types, explicit aliases, specs, arrays, missing uniforms', () => {
   const gl = mockGL();
   const info = {
      u_a: { loc: 'A', type: 5126, size: 1 },
      u_c: { loc: 'C', type: 35665, size: 1 },
      u_i: { loc: 'I', type: 5124, size: 1 },
      u_t: { loc: 'T', type: 35666, size: 1 },
      u_arr: { loc: 'R', type: 5126, size: 3 },      // float[3]
   };
   applyUniformMap(gl, info, {
      u_a: 0.25,
      u_c: [1, 0, 0],
      u_i: { type: 'int', value: 3 },
      u_t: { type: '4f', value: [1, 2, 3, 4] },
      u_arr: [0.1, 0.2, 0.3],
      u_missing: 1,
   });
   assert.deepEqual(gl.calls.map(c => c[0]), ['uniform1f', 'uniform3fv', 'uniform1i', 'uniform4fv', 'uniform1fv']);
   assert.throws(() => applyUniformMap(gl, info, { u_missing: 1 }, { strict: true }), /Unknown uniform/);
   assert.throws(() => applyUniformMap(gl, info, { u_a: { type: 'wat', value: 1 } }, { strict: true }), /Unknown uniform type/);
});

test('tweens: numbers, arrays, interruption, easing names', async () => {
   const T = createTweens();
   let v = 0, c = [0, 0, 0];
   const p1 = T.tween('a', () => v, x => { v = x; }, 10, { duration: 100, ease: 'linear' });
   const p2 = T.tween('c', () => c, x => { c = x; }, [1, 2, 3], { duration: 100, ease: 'linear' });
   const t0 = performance.now();
   T.update(t0 + 50);
   assert.ok(Math.abs(v - 5) < 0.6, 'midway ' + v);
   assert.ok(Math.abs(c[2] - 1.5) < 0.2);
   T.update(t0 + 200);
   assert.equal(v, 10);
   assert.deepEqual(c, [1, 2, 3]);
   assert.equal(await p1, true);
   assert.equal(await p2, true);
   assert.equal(T.size, 0);

   const p3 = T.tween('a', () => v, x => { v = x; }, 0, { duration: 1000 });
   T.tween('a', () => v, x => { v = x; }, 5, { duration: 10 });   // interrupts p3
   assert.equal(await p3, false);
   for (const k in EASES) { assert.ok(Math.abs(EASES[k](1) - 1) < 1e-6, k); assert.ok(Math.abs(EASES[k](0)) < 1e-6, k); }
});
