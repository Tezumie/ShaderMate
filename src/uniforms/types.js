// Uniform type resolution.
//
// A uniform `type` may be written as the GLSL type ('float', 'vec3', 'mat4', 'int[]', ...)
// or as the classic WebGL shorthand ('1f', '3f', 'Matrix4fv', ...). Case-insensitive.
// If no type is given at all, it's inferred from the compiled shader (see describeGLType).
//
// Descriptor: { kind: 'f' | 'i' | 'u' | 'm', n }  (n = components, or matrix dimension)

const ALIASES = Object.create(null);
const add = (desc, ...names) => names.forEach(n => { ALIASES[n.toLowerCase()] = desc; });

// float family
add({ kind: 'f', n: 1 }, 'float', 'number', 'f', '1f', '1fv', 'float[]', 'uniform1f', 'uniform1fv');
add({ kind: 'f', n: 2 }, 'vec2', '2f', '2fv', 'vec2[]', 'uniform2f', 'uniform2fv');
add({ kind: 'f', n: 3 }, 'vec3', '3f', '3fv', 'vec3[]', 'uniform3f', 'uniform3fv');
add({ kind: 'f', n: 4 }, 'vec4', '4f', '4fv', 'vec4[]', 'uniform4f', 'uniform4fv');

// int / bool family (bool uniforms are uploaded as ints)
add({ kind: 'i', n: 1 }, 'int', 'bool', 'boolean', 'i', '1i', '1iv', 'int[]', 'bool[]', 'uniform1i', 'uniform1iv');
add({ kind: 'i', n: 2 }, 'ivec2', 'bvec2', '2i', '2iv', 'ivec2[]', 'bvec2[]', 'uniform2i', 'uniform2iv');
add({ kind: 'i', n: 3 }, 'ivec3', 'bvec3', '3i', '3iv', 'ivec3[]', 'bvec3[]', 'uniform3i', 'uniform3iv');
add({ kind: 'i', n: 4 }, 'ivec4', 'bvec4', '4i', '4iv', 'ivec4[]', 'bvec4[]', 'uniform4i', 'uniform4iv');

// unsigned int (WebGL2)
add({ kind: 'u', n: 1 }, 'uint', '1ui', '1uiv', 'uint[]');
add({ kind: 'u', n: 2 }, 'uvec2', '2ui', '2uiv', 'uvec2[]');
add({ kind: 'u', n: 3 }, 'uvec3', '3ui', '3uiv', 'uvec3[]');
add({ kind: 'u', n: 4 }, 'uvec4', '4ui', '4uiv', 'uvec4[]');

// matrices
add({ kind: 'm', n: 2 }, 'mat2', 'matrix2fv', 'mat2fv', 'uniformmatrix2fv');
add({ kind: 'm', n: 3 }, 'mat3', 'matrix3fv', 'mat3fv', 'uniformmatrix3fv');
add({ kind: 'm', n: 4 }, 'mat4', 'matrix4fv', 'mat4fv', 'uniformmatrix4fv');

/** 'vec3' | '3f' | 'Matrix4fv' | ... -> descriptor, or null if unknown. */
export function resolveUniformType(type) {
   if (typeof type !== 'string') return null;
   return ALIASES[type.trim().toLowerCase()] || null;
}

// GL enum -> descriptor (numeric constants are identical across contexts)
const GL_TYPES = {
   5126: { kind: 'f', n: 1 },  // FLOAT
   35664: { kind: 'f', n: 2 }, // FLOAT_VEC2
   35665: { kind: 'f', n: 3 },
   35666: { kind: 'f', n: 4 },
   5124: { kind: 'i', n: 1 },  // INT
   35667: { kind: 'i', n: 2 }, // INT_VEC2
   35668: { kind: 'i', n: 3 },
   35669: { kind: 'i', n: 4 },
   35670: { kind: 'i', n: 1 }, // BOOL
   35671: { kind: 'i', n: 2 }, // BOOL_VEC2
   35672: { kind: 'i', n: 3 },
   35673: { kind: 'i', n: 4 },
   5125: { kind: 'u', n: 1 },  // UNSIGNED_INT
   36294: { kind: 'u', n: 2 }, // UNSIGNED_INT_VEC2
   36295: { kind: 'u', n: 3 },
   36296: { kind: 'u', n: 4 },
   35674: { kind: 'm', n: 2 }, // FLOAT_MAT2
   35675: { kind: 'm', n: 3 },
   35676: { kind: 'm', n: 4 },
};

/** Active-uniform GL type -> descriptor. Samplers etc. return undefined (managed via channels). */
export function describeGLType(glType) {
   return GL_TYPES[glType];
}

export const GL_FLOAT = 5126;
export const GL_FLOAT_VEC2 = 35664;
export const GL_FLOAT_VEC4 = 35666;
