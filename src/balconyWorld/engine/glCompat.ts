/**
 * expo-gl ⇄ three.js compatibility.
 *
 * three r163+ refuses any rendering context that is an `instanceof
 * WebGLRenderingContext`, because in browsers that means WebGL 1. expo-gl,
 * matching the WebGL IDL rather than browser practice, makes its
 * `WebGL2RenderingContext.prototype` inherit from
 * `WebGLRenderingContext.prototype`, so on a phone every expo-gl context
 * fails that check with "WebGL 1 is not supported since r163" — even though
 * it is a WebGL 2 context. Browsers keep the two classes as siblings, which
 * is why the same scene renders fine on the web.
 *
 * `prepareContextForThree` rebuilds the context's prototype as one flat
 * object holding every method and constant from the whole chain, then
 * re-parents the context to it. Nothing about the context's behaviour
 * changes; it simply stops inheriting from WebGLRenderingContext.
 */
export interface GLLike {
  supportsWebGL2?: boolean;
}

export class WebGL2UnavailableError extends Error {
  constructor() {
    super('This device does not support OpenGL ES 3 / WebGL 2, which the 3D balcony needs.');
    this.name = 'WebGL2UnavailableError';
  }
}

export function prepareContextForThree<T extends object>(gl: T): T {
  const g = globalThis as unknown as { WebGLRenderingContext?: unknown };
  const WebGL1 = g.WebGLRenderingContext;
  if (typeof WebGL1 !== 'function') return gl;
  if (!(gl instanceof (WebGL1 as new () => unknown))) return gl; // browsers: nothing to do

  if ((gl as GLLike).supportsWebGL2 === false) throw new WebGL2UnavailableError();

  const chain: object[] = [];
  for (let p = Object.getPrototypeOf(gl); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
    chain.push(p);
  }
  // Farthest ancestor first so nearer prototypes override, as lookup would.
  const flat: Record<string | symbol, unknown> = {};
  for (const proto of chain.reverse()) {
    Object.defineProperties(flat, Object.getOwnPropertyDescriptors(proto));
  }
  Object.setPrototypeOf(gl, flat);
  return gl;
}
