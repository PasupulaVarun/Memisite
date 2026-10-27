/**
 * Camera lifecycle. Explicit states instead of loosely related booleans
 * (see product spec section 11). `loading-model` / `tracking-ready` /
 * `capturing` / `reviewing` join this union in later milestones.
 */
export type CameraErrorKind =
  | 'permission-denied'
  | 'no-camera'
  | 'in-use'
  | 'insecure-context'
  | 'unsupported'
  | 'disconnected'
  | 'unknown';

export type CameraState =
  | { status: 'idle' }
  | { status: 'requesting-permission' }
  | { status: 'camera-ready' }
  | { status: 'error'; error: CameraErrorKind };

export type StudioState = CameraState['status'];

/** What the status bar shows. */
export interface StudioStatus {
  state: StudioState;
  cameraLabel: string;
  cameraOn: boolean;
  effectLabel: string;
  triggerLabel: string;
}

const cameraLabels: Record<StudioState, string> = {
  idle: 'Camera off',
  'requesting-permission': 'Waiting for permission',
  'camera-ready': 'Camera on',
  error: 'Camera error',
};

export function toStudioStatus(camera: CameraState): StudioStatus {
  return {
    state: camera.status,
    cameraLabel: cameraLabels[camera.status],
    cameraOn: camera.status === 'camera-ready',
    effectLabel: 'No effect',
    triggerLabel: 'No trigger',
  };
}
