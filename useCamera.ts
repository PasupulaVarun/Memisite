import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraError, startCamera, stopStream } from './cameraService';
import type { CameraState } from './cameraTypes';

/**
 * Owns the camera lifecycle for one component. Guarantees:
 *  - the browser is asked for the camera only when `start` is called;
 *  - overlapping `start` calls are ignored (no duplicate initialisation);
 *  - a stream that arrives after Stop, Cancel or unmount is stopped at once;
 *  - every track is stopped on `stop`, on unmount and when the page is hidden for good;
 *  - a device that disappears moves the UI to an error state instead of freezing.
 */
export function useCamera() {
  const [state, setState] = useState<CameraState>({ status: 'idle' });
  const [previewLive, setPreviewLive] = useState(false);

  const phaseRef = useRef<CameraState['status']>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const attemptRef = useRef(0); // bumped to invalidate any in-flight start
  const videoRef = useRef<HTMLVideoElement>(null);

  const transition = useCallback((next: CameraState) => {
    phaseRef.current = next.status;
    setState(next);
  }, []);

  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) stopStream(stream);
  }, []);

  const start = useCallback(async () => {
    if (phaseRef.current === 'requesting-permission' || phaseRef.current === 'camera-ready') return;

    const attempt = ++attemptRef.current;
    setPreviewLive(false);
    transition({ status: 'requesting-permission' });

    try {
      const stream = await startCamera();
      if (attempt !== attemptRef.current) {
        stopStream(stream); // cancelled or unmounted while the prompt was open
        return;
      }

      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => {
          if (streamRef.current !== stream) return; // we stopped it ourselves
          releaseStream();
          setPreviewLive(false);
          transition({ status: 'error', error: 'disconnected' });
        },
        { once: true },
      );
      transition({ status: 'camera-ready' });
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      transition({ status: 'error', error: err instanceof CameraError ? err.kind : 'unknown' });
    }
  }, [releaseStream, transition]);

  /** Stops the camera, or cancels a start that is still waiting for permission. */
  const stop = useCallback(() => {
    attemptRef.current++;
    releaseStream();
    setPreviewLive(false);
    transition({ status: 'idle' });
  }, [releaseStream, transition]);

  // Connect the stream to the <video> element while the camera is on.
  useEffect(() => {
    const video = videoRef.current;
    if (state.status !== 'camera-ready' || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      /* autoplay can be interrupted by a quick stop; nothing to recover */
    });
    return () => {
      video.srcObject = null;
    };
  }, [state.status]);

  // Release everything on unmount and when the page goes away.
  useEffect(() => {
    const onPageHide = () => releaseStream();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      attemptRef.current++;
      releaseStream();
    };
  }, [releaseStream]);

  const onPreviewPlaying = useCallback(() => setPreviewLive(true), []);

  return { state, previewLive, videoRef, start, stop, onPreviewPlaying };
}
