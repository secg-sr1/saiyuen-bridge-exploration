// Module-level gl reference — set once from inside the Canvas via useThree
let _gl = null;

export function setGl(gl) {
  _gl = gl;
}

export function captureScreenshot() {
  if (!_gl) return null;
  // R3F sets preserveDrawingBuffer:false by default; we need to force a render first.
  // toDataURL works because we pass preserveDrawingBuffer:true on the Canvas.
  return _gl.domElement.toDataURL('image/png');
}

/**
 * Composite the live camera video feed + the WebGL 3D canvas into a single
 * image suitable for DALL-E landscape analysis.
 * Returns a JPEG data URL, or null if either source is unavailable.
 */
export function captureComposite() {
  const video  = document.getElementById('videoBackground');
  const glCanvas = _gl?.domElement;
  if (!glCanvas) return null;

  const out = document.createElement('canvas');
  out.width  = glCanvas.width;
  out.height = glCanvas.height;
  const ctx = out.getContext('2d');

  // Layer 1: camera feed
  if (video && video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, out.width, out.height);
  }

  // Layer 2: Three.js scene (transparent background, composited on top)
  ctx.drawImage(glCanvas, 0, 0);

  return out.toDataURL('image/jpeg', 0.92);
}
