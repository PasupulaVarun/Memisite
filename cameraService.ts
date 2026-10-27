import type { CameraErrorKind } from './cameraTypes';

/**
 * The only module that touches navigator.mediaDevices. Everything else asks
 * this service for a stream and hands it back to stop it. Camera frames never
 * leave the browser: nothing here (or anywhere in the app) sends them anywhere.
 */

export class CameraError extends Error {
  readonly kind: CameraErrorKind;

  constructor(kind: CameraErrorKind, cause?: unknown) {
    super(`Camera error: ${kind}`);
    this.name = 'CameraError';
    this.kind = kind;
    this.cause = cause;
  }
}

const preferredConstraints: MediaStreamConstraints = {
  video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: false,
};

const fallbackConstraints: MediaStreamConstraints = { video: true, audio: false };

function errorName(err: unknown): string {
  return typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : '';
}

/** Returns why the camera cannot be used in this page, or null if it can. */
export function checkCameraSupport(): CameraErrorKind | null {
  if (!window.isSecureContext) return 'insecure-context';
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return 'unsupported';
  return null;
}

export function classifyCameraError(err: unknown): CameraErrorKind {
  switch (errorName(err)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission-denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use';
    default:
      return 'unknown';
  }
}

function isConstraintError(err: unknown): boolean {
  const name = errorName(err);
  return name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError';
}

/**
 * Asks the browser for the camera. This is what triggers the permission
 * prompt, so call it only from a user action. Rejects with CameraError.
 */
export async function startCamera(): Promise<MediaStream> {
  const unsupported = checkCameraSupport();
  if (unsupported) throw new CameraError(unsupported);

  try {
    return await navigator.mediaDevices.getUserMedia(preferredConstraints);
  } catch (err) {
    if (!isConstraintError(err)) throw new CameraError(classifyCameraError(err), err);
  }

  // The preferred resolution was rejected: retry with any available camera.
  try {
    return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
  } catch (err) {
    throw new CameraError(classifyCameraError(err), err);
  }
}

/** Stops every track so the camera light turns off. Safe to call twice. */
export function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
