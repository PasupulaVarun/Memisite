export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where a video frame lands inside a container when drawn with
 * `object-fit: contain`. Landmarks are normalised to the frame, so they must
 * be mapped through this rectangle, not the whole container.
 */
export function containRect(containerWidth: number, containerHeight: number, frameWidth: number, frameHeight: number): Rect {
  if (frameWidth <= 0 || frameHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scale = Math.min(containerWidth / frameWidth, containerHeight / frameHeight);
  const width = frameWidth * scale;
  const height = frameHeight * scale;
  return { x: (containerWidth - width) / 2, y: (containerHeight - height) / 2, width, height };
}

/** The 21-point MediaPipe hand skeleton as index pairs. */
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];
