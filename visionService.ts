import { VisionError, type BackendFactory, type LandmarkerBackend, type TrackingResult } from './types';

/**
 * Owns the model lifecycle and turns a video frame into a TrackingResult.
 * It knows nothing about React, canvases or rendering.
 *
 *  - `load()` is idempotent: concurrent callers share one load, and a loaded
 *    service never loads again (no duplicate model initialisation).
 *  - `dispose()` releases the models, also if it is called while loading.
 *    The service can be loaded again afterwards.
 *  - Timestamps passed to the model are strictly increasing, which MediaPipe requires.
 */
export class VisionService {
  private backend: LandmarkerBackend | null = null;
  private loading: Promise<void> | null = null;
  private generation = 0;
  private lastTimestamp = 0;

  constructor(private readonly createBackend: BackendFactory) {}

  get isLoaded(): boolean {
    return this.backend !== null;
  }

  load(): Promise<void> {
    if (this.backend) return Promise.resolve();
    if (this.loading) return this.loading;

    const generation = this.generation;
    const attempt = this.loadBackend(generation);
    const tracked: Promise<void> = attempt.finally(() => {
      if (this.loading === tracked) this.loading = null;
    });
    this.loading = tracked;
    return tracked;
  }

  private async loadBackend(generation: number): Promise<void> {
    let backend: LandmarkerBackend;
    try {
      backend = await this.createBackend();
    } catch (err) {
      throw err instanceof VisionError ? err : new VisionError('model-load', err);
    }
    if (generation !== this.generation) {
      backend.close(); // disposed while loading: release what just arrived
      throw new VisionError('cancelled');
    }
    this.backend = backend;
  }

  /** Runs both models on the current video frame. Throws VisionError('inference') on failure. */
  detect(video: HTMLVideoElement, nowMs: number): TrackingResult {
    const backend = this.backend;
    if (!backend) throw new VisionError('inference', new Error('Models are not loaded'));

    const timestampMs = nowMs > this.lastTimestamp ? nowMs : this.lastTimestamp + 1;
    this.lastTimestamp = timestampMs;

    const started = performance.now();
    try {
      const faces = backend.detectFaces(video, timestampMs);
      const hands = backend.detectHands(video, timestampMs);
      return {
        timestampMs,
        frameWidth: video.videoWidth,
        frameHeight: video.videoHeight,
        faces,
        hands,
        inferenceMs: performance.now() - started,
      };
    } catch (err) {
      throw new VisionError('inference', err);
    }
  }

  dispose(): void {
    this.generation++;
    this.loading = null;
    const backend = this.backend;
    this.backend = null;
    this.lastTimestamp = 0;
    if (backend) {
      try {
        backend.close();
      } catch {
        /* closing twice or after a crash must not throw into the UI */
      }
    }
  }
}
