import { HAND_CONNECTIONS, type Rect } from './overlayGeometry';
import type { TrackingResult } from './types';

const FACE_COLOUR = '#b9a1ff';
const HAND_COLOUR = '#5eead4';

/**
 * Draws landmarks for one result. Pure drawing: no state, no inference.
 * `frame` is where the video frame sits inside the canvas (CSS pixels).
 * No text is drawn here because the canvas is mirrored like the preview.
 */
export function drawTracking(ctx: CanvasRenderingContext2D, result: TrackingResult, frame: Rect): void {
  const px = (x: number) => frame.x + x * frame.width;
  const py = (y: number) => frame.y + y * frame.height;

  ctx.fillStyle = FACE_COLOUR;
  for (const face of result.faces) {
    for (const p of face.landmarks) {
      ctx.fillRect(px(p.x) - 1, py(p.y) - 1, 2, 2);
    }
  }

  ctx.strokeStyle = HAND_COLOUR;
  ctx.fillStyle = HAND_COLOUR;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const hand of result.hands) {
    const pts = hand.landmarks;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = pts[a];
      const pb = pts[b];
      if (!pa || !pb) continue;
      ctx.moveTo(px(pa.x), py(pa.y));
      ctx.lineTo(px(pb.x), py(pb.y));
    }
    ctx.stroke();
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
