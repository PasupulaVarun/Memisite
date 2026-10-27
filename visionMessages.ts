import type { VisionErrorKind } from './types';

export interface VisionErrorCopy {
  title: string;
  body: string;
  canRetry: boolean;
}

export const visionErrorCopy: Record<Exclude<VisionErrorKind, 'cancelled'>, VisionErrorCopy> = {
  'model-load': {
    title: 'Tracking could not start',
    body: 'The tracking model failed to load. Retry, or continue without tracking. The camera is still on.',
    canRetry: true,
  },
  inference: {
    title: 'Tracking stopped',
    body: 'Tracking hit repeated errors and was paused. Retry, or continue without tracking. The camera is still on.',
    canRetry: true,
  },
  unsupported: {
    title: 'Tracking is not supported here',
    body: 'This browser lacks a feature the tracking model needs (WebAssembly). The camera still works.',
    canRetry: false,
  },
};
