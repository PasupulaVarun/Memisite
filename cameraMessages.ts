import type { CameraErrorKind } from './cameraTypes';

export interface CameraErrorCopy {
  title: string;
  body: string;
  /** False when pressing "Try again" cannot possibly help. */
  canRetry: boolean;
}

export const cameraErrorCopy: Record<CameraErrorKind, CameraErrorCopy> = {
  'permission-denied': {
    title: 'Camera access is blocked',
    body: 'Allow camera access for this site in your browser settings, then press Try again.',
    canRetry: true,
  },
  'no-camera': {
    title: 'No camera found',
    body: 'Connect a camera or check that it is enabled, then press Try again.',
    canRetry: true,
  },
  'in-use': {
    title: 'The camera could not start',
    body: 'Another app or browser tab may be using it, or your system may be blocking access. Close other camera apps, then press Try again.',
    canRetry: true,
  },
  'insecure-context': {
    title: 'The camera needs a secure connection',
    body: 'Browsers only allow camera access on HTTPS pages or localhost. Open Memisite over HTTPS to use the camera.',
    canRetry: false,
  },
  unsupported: {
    title: 'This browser cannot use the camera',
    body: 'Update your browser or try a recent version of Chrome, Edge, Firefox or Safari.',
    canRetry: false,
  },
  disconnected: {
    title: 'The camera disconnected',
    body: 'The camera stopped sending video. Reconnect it, then press Try again.',
    canRetry: true,
  },
  unknown: {
    title: 'The camera could not start',
    body: 'Something went wrong. Press Try again. If it keeps happening, reload the page.',
    canRetry: true,
  },
};
