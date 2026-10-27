/** A point in normalised video-frame coordinates: x and y run 0..1 across the frame. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceTrack {
  landmarks: Landmark[];
  /**
   * MediaPipe's FaceLandmarker does not report a per-face score. Detection is
   * gated by the min*Confidence thresholds in the backend, so a face that is
   * returned has already passed them. Kept as null rather than invented.
   */
  confidence: number | null;
}

export interface HandTrack {
  landmarks: Landmark[];
  /** Label exactly as MediaPipe reports it. Do not rely on left/right until mirroring is decided. */
  handedness: string;
  /** Score of the handedness classification, 0..1. */
  confidence: number;
}

export interface TrackingResult {
  /** Monotonic timestamp (ms) passed to the model for this frame. */
  timestampMs: number;
  frameWidth: number;
  frameHeight: number;
  faces: FaceTrack[];
  hands: HandTrack[];
  /** Time spent inside the model for this frame. */
  inferenceMs: number;
}

export type VisionErrorKind = 'unsupported' | 'model-load' | 'inference' | 'cancelled';

export class VisionError extends Error {
  readonly kind: VisionErrorKind;

  constructor(kind: VisionErrorKind, cause?: unknown) {
    super(`Vision error: ${kind}`);
    this.name = 'VisionError';
    this.kind = kind;
    this.cause = cause;
  }
}

/** What the vision service needs from a model runtime. Keeps MediaPipe behind one seam. */
export interface LandmarkerBackend {
  detectFaces(video: HTMLVideoElement, timestampMs: number): FaceTrack[];
  detectHands(video: HTMLVideoElement, timestampMs: number): HandTrack[];
  /** Releases the models. Must be safe to call more than once. */
  close(): void;
}

export type BackendFactory = () => Promise<LandmarkerBackend>;

export type TrackerStatus = 'idle' | 'loading-model' | 'tracking-ready' | 'error';

/** Low-frequency summary for the UI. Full landmark data never goes through React state. */
export interface TrackingStats {
  fps: number;
  inferenceMs: number;
  faces: number;
  hands: { handedness: string; confidence: number }[];
  /** Milliseconds since a face / hand was last seen (since tracking started if never). */
  msWithoutFace: number;
  msWithoutHand: number;
}

export const emptyStats: TrackingStats = {
  fps: 0,
  inferenceMs: 0,
  faces: 0,
  hands: [],
  msWithoutFace: 0,
  msWithoutHand: 0,
};
