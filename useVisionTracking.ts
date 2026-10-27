import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createMediaPipeBackend } from './mediapipeBackend';
import { TrackingLoop } from './trackingLoop';
import { emptyStats, VisionError, type TrackerStatus, type TrackingResult, type TrackingStats, type VisionErrorKind } from './types';
import { VisionService } from './visionService';

export interface LatestTracking {
  result: TrackingResult;
  /** performance.now() when the result arrived, used to hide stale overlays. */
  receivedAt: number;
}

interface Options {
  /** True only while tracking should run: debug on, camera live, preview playing. */
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
}

/**
 * Connects the vision service and the frame loop to React.
 *  - Full landmark data goes into `latest` (a ref), never into state, so a
 *    20fps stream does not re-render the UI.
 *  - React state holds only the status and a summary that updates ~4 times a second.
 *  - Models are loaded when `enabled` becomes true and released when it becomes false or on unmount.
 */
export function useVisionTracking({ enabled, videoRef }: Options) {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [error, setError] = useState<VisionErrorKind | null>(null);
  const [stats, setStats] = useState<TrackingStats>(emptyStats);
  const [attempt, setAttempt] = useState(0);

  const latest = useRef<LatestTracking | null>(null);
  const serviceRef = useRef<VisionService | null>(null);

  const getService = useCallback((): VisionService => {
    if (!serviceRef.current) serviceRef.current = new VisionService(createMediaPipeBackend);
    return serviceRef.current;
  }, []);

  useEffect(() => {
    latest.current = null;

    if (!enabled) {
      serviceRef.current?.dispose(); // tracking off: give the models back
      setStatus('idle');
      setError(null);
      setStats(emptyStats);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const service = getService();
    let cancelled = false;
    let loop: TrackingLoop | null = null;

    setStatus('loading-model');
    setError(null);

    service
      .load()
      .then(() => {
        if (cancelled) return;
        loop = new TrackingLoop(service, video, {
          onResult: (result) => {
            latest.current = { result, receivedAt: performance.now() };
          },
          onStats: (next) => {
            if (!cancelled) setStats(next);
          },
          onFatal: (err) => {
            if (cancelled) return;
            setError(err.kind);
            setStatus('error');
          },
        });
        loop.start();
        setStatus('tracking-ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const kind = err instanceof VisionError ? err.kind : 'model-load';
        if (kind === 'cancelled') return;
        setError(kind);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      loop?.stop();
      latest.current = null;
    };
  }, [enabled, attempt, videoRef, getService]);

  // Release the models when the component using this hook goes away.
  useEffect(() => {
    return () => {
      serviceRef.current?.dispose();
      serviceRef.current = null;
    };
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, error, stats, latest, retry };
}
