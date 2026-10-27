export type EffectCategory = 'face' | 'meme' | 'background' | 'caption' | 'sound';

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  /** Product phase from the spec: 1 = MVP, 2 = creative studio. */
  phase: 1 | 2;
  /** Every entry is a planned item until its renderer exists. */
  status: 'planned';
}

export const effectCategories: readonly { id: EffectCategory; label: string }[] = [
  { id: 'face', label: 'Face filters' },
  { id: 'meme', label: 'Meme stickers' },
  { id: 'background', label: 'Backgrounds' },
  { id: 'caption', label: 'Captions' },
  { id: 'sound', label: 'Sounds' },
];

export function categoryLabel(id: EffectCategory): string {
  return effectCategories.find((c) => c.id === id)?.label ?? id;
}

export const effectRegistry: readonly EffectDefinition[] = [
  {
    id: 'face-sticker',
    name: 'Face-anchored sticker',
    description: 'A sticker that stays attached to a tracked point on your face as you move.',
    category: 'face',
    phase: 1,
    status: 'planned',
  },
  {
    id: 'surprise-overlay',
    name: 'Surprise overlay',
    description: 'A reaction overlay shown while your mouth is open.',
    category: 'face',
    phase: 1,
    status: 'planned',
  },
  {
    id: 'hand-sticker',
    name: 'Hand-anchored sticker',
    description: 'Places a meme sticker near your raised hand and follows it smoothly.',
    category: 'meme',
    phase: 1,
    status: 'planned',
  },
  {
    id: 'thumbs-up-reaction',
    name: 'Thumbs-up reaction',
    description: 'Shows a chosen sticker when a thumbs-up is detected.',
    category: 'meme',
    phase: 1,
    status: 'planned',
  },
  {
    id: 'virtual-background',
    name: 'Virtual background',
    description: 'Replaces what is behind you. Needs person segmentation.',
    category: 'background',
    phase: 2,
    status: 'planned',
  },
  {
    id: 'caption-bar',
    name: 'Caption bar',
    description: 'Adds meme-style text to the top or bottom of the frame.',
    category: 'caption',
    phase: 2,
    status: 'planned',
  },
  {
    id: 'reaction-sound',
    name: 'Reaction sound',
    description: 'Plays a short sound when a trigger fires. Will include a sound toggle.',
    category: 'sound',
    phase: 2,
    status: 'planned',
  },
];
