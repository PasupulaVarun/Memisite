import { VisionError, type TrackingResult, type TrackingStats } from './types';
import type { VisionService } from './visionService';

/**
 * Feeds video frames to the vision service at a capped rate. It never renders
 * and never touches React: results go out through callbacks.
 *
 * Guards against wasted work:
 *  - at most `maxFps` inferences per second, however fast the camera is;
 *  - a frame is processed only if it is a new frame;
 *  - nothing runs while the tab is hidden or the video has no data;
 *  - inference is synchronous, so calls can never overlap;
 *  - after `maxConsecutiveErrors` failures in a row the loop stops itself.
 */

export interface LoopOptions {
  maxFps: number;
  maxConsecutiveErrors: number;
  statsIntervalMs: number;
}

export const defaultLoopOptions: LoopOptions = {
  maxFps: 20,
  maxConsecutiveErrors: 5,
  statsIntervalMs: 250,
};

export interface LoopHandlers {
  onResult(result: TrackingResult): void;
  onStats(stats: TrackingStats): void;
  onFatal(error: VisionError): void;
}

export interface FrameScheduler {
  /** True when every callback corresponds to a fresh video frame. */
  readonly guaranteesNewFrame: boolean;
  /** Schedules `callback` for the next frame and returns a function that cancels it. */
  request(callback: () => void): () => void;
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function createBrowserScheduler(video: HTMLVideoElement): FrameScheduler {
  const v = video as VideoWithFrameCallback;
  if (typeof v.requestVideoFrameCallback === 'function' && typeof v.cancelVideoFrameCallback === 'function') {
    return {
      guaranteesNewFrame: true,
      request(callback) {
        const handle = v.requestVideoFrameCallback!(callback);
        return () => v.cancelVideoFrameCallback!(handle);
      },
    };
  }
  return {
    guaranteesNewFrame: false,
    request(callback) {
      const handle = requestAnimationFrame(callback);
      return () => cancelAnimationFrame(handle);
    },
  };
}

export class TrackingLoop {
  private running = false;
  private cancelFrame: (() => void) | null = null;
  private lastRunAt = -Infinity;
  private lastVideoTime = -1;
  private consecutiveErrors = 0;

  private lastFaceAt = 0;
  private lastHandAt = 0;
  private lastStatsAt = 0;
  private processedSinceStats = 0;
  private inferenceMsAverage = 0;
  private latest: TrackingResult | null = null;

  constructor(
    private readonly service: VisionService,
    private readonly video: HTMLVideoElement,
    private readonly handlers: LoopHandlers,
    private readonly options: LoopOptions = defaultLoopOptions,
    private readonly scheduler: FrameScheduler = createBrowserScheduler(video),
    private readonly clock: () => number = () => performance.now(),
    private readonly isHidden: () => boolean = () => typeof document !== 'undefined' && document.hidden,
  ) {}

  start(): void {
    if (this.running) return; // never run two loops on one instance
    this.running = true;
    this.consecutiveErrors = 0;
    this.lastVideoTime = -1;
    this.lastRunAt = -Infinity;
    this.lastFaceAt = this.lastHandAt = this.lastStatsAt = this.clock();
    this.processedSinceStats = 0;
    this.cancelFrame = this.scheduler.request(this.tick);
  }

  stop(): void {
    this.running = false;
    this.cancelFrame?.();
    this.cancelFrame = null;
  }

  private readonly tick = (): void => {
    if (!this.running) return;
    this.cancelFrame = this.scheduler.request(this.tick);

    const now = this.clock();
    this.maybeEmitStats(now);

    if (this.isHidden()) return;
    if (this.video.readyState < 2 || this.video.videoWidth === 0) return;

    const minInterval = 1000 / this.options.maxFps;
    if (now - this.lastRunAt < minInterval - 4) return; // 4ms slack so a 30fps camera can hit a 30fps cap

    if (!this.scheduler.guaranteesNewFrame) {
      if (this.video.currentTime === this.lastVideoTime) return;
      this.lastVideoTime = this.video.currentTime;
    }

    this.lastRunAt = now;
    try {
      const result = this.service.detect(this.video, now);
      this.consecutiveErrors = 0;
      this.latest = result;
      this.processedSinceStats++;
      this.inferenceMsAverage =
        this.inferenceMsAverage === 0 ? result.inferenceMs : this.inferenceMsAverage * 0.8 + result.inferenceMs * 0.2;
      if (result.faces.length > 0) this.lastFaceAt = now;
      if (result.hands.length > 0) this.lastHandAt = now;
      this.handlers.onResult(result);
    } catch (err) {
      this.consecutiveErrors++;
      if (this.consecutiveErrors >= this.options.maxConsecutiveErrors) {
        this.stop();
        this.handlers.onFatal(err instanceof VisionError ? err : new VisionError('inference', err));
      }
    }
  };

  private maybeEmitStats(now: number): void {
    const elapsed = now - this.lastStatsAt;
    if (elapsed < this.options.statsIntervalMs) return;
    const latest = this.latest;
    this.handlers.onStats({
      fps: (this.processedSinceStats * 1000) / elapsed,
      inferenceMs: this.inferenceMsAverage,
      faces: latest?.faces.length ?? 0,
      hands: (latest?.hands ?? []).map((h) => ({ handedness: h.handedness, confidence: h.confidence })),
      msWithoutFace: now - this.lastFaceAt,
      msWithoutHand: now - this.lastHandAt,
    });
    this.lastStatsAt = now;
    this.processedSinceStats = 0;
  }
}
