export interface WebGLCaps {
  supported: boolean;
  renderer: string;
  /** SwiftShader, llvmpipe and friends: works, but must start at the lowest tier. */
  software: boolean;
  maxTextureSize: number;
  /** Can render to half-float targets, which the HDR post-processing chain needs. */
  floatTargets: boolean;
}

const UNSUPPORTED: WebGLCaps = { supported: false, renderer: "none", software: false, maxTextureSize: 0, floatTargets: false };

/** Ask a throwaway context what this browser can do, before committing to the real Canvas. Client-only. */
export function probeWebGL(): WebGLCaps {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return UNSUPPORTED;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    const caps: WebGLCaps = {
      supported: true,
      renderer,
      software: /swiftshader|llvmpipe|softpipe|software/i.test(renderer),
      maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      floatTargets: Boolean(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"))
    };
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return caps;
  } catch {
    return UNSUPPORTED;
  }
}
