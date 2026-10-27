import { VisionError, type FaceTrack, type HandTrack, type LandmarkerBackend, type Landmark } from './types';

/**
 * The only file that imports MediaPipe. It is loaded with a dynamic import so
 * the library and its WebAssembly are fetched only when tracking is first
 * turned on. Wasm and model files are served from this site (see
 * scripts/setup-vision-assets.mjs), so no camera data or requests go to a third party.
 */

const base = import.meta.env.BASE_URL;
const WASM_PATH = `${base}mediapipe/wasm`;
const FACE_MODEL = `${base}models/face_landmarker.task`;
const HAND_MODEL = `${base}models/hand_landmarker.task`;

// Detection gates. Anything below these is reported as "not detected".
const MIN_CONFIDENCE = 0.5;

interface RawLandmark {
  x: number;
  y: number;
  z: number;
}

interface RawCategory {
  score: number;
  categoryName?: string;
  displayName?: string;
}

function toLandmarks(points: RawLandmark[]): Landmark[] {
  return points.map((p) => ({ x: p.x, y: p.y, z: p.z }));
}

type Delegate = 'GPU' | 'CPU';

export async function createMediaPipeBackend(): Promise<LandmarkerBackend> {
  if (typeof WebAssembly === 'undefined') throw new VisionError('unsupported');

  const { FilesetResolver, FaceLandmarker, HandLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

  async function create(delegate: Delegate) {
    const face = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: MIN_CONFIDENCE,
      minFacePresenceConfidence: MIN_CONFIDENCE,
      minTrackingConfidence: MIN_CONFIDENCE,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    try {
      const hand = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: MIN_CONFIDENCE,
        minHandPresenceConfidence: MIN_CONFIDENCE,
        minTrackingConfidence: MIN_CONFIDENCE,
      });
      return { face, hand };
    } catch (err) {
      face.close(); // never leave half a pair alive
      throw err;
    }
  }

  let models: Awaited<ReturnType<typeof create>>;
  try {
    models = await create('GPU');
  } catch {
    // No WebGL2/GPU delegate (or it failed): fall back to the slower CPU path.
    models = await create('CPU');
  }
  const { face, hand } = models;
  let closed = false;

  return {
    detectFaces(video, timestampMs): FaceTrack[] {
      const result = face.detectForVideo(video, timestampMs);
      return result.faceLandmarks.map((points: RawLandmark[]) => ({
        landmarks: toLandmarks(points),
        confidence: null,
      }));
    },

    detectHands(video, timestampMs): HandTrack[] {
      const result = hand.detectForVideo(video, timestampMs) as {
        landmarks: RawLandmark[][];
        handedness?: RawCategory[][];
        handednesses?: RawCategory[][]; // older package versions
      };
      const categories = result.handedness ?? result.handednesses ?? [];
      return result.landmarks.map((points, index) => {
        const top = categories[index]?.[0];
        return {
          landmarks: toLandmarks(points),
          handedness: top?.categoryName ?? top?.displayName ?? 'Unknown',
          confidence: top?.score ?? 0,
        };
      });
    },

    close() {
      if (closed) return;
      closed = true;
      face.close();
      hand.close();
    },
  };
}
