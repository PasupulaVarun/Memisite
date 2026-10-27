export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  /** What the trigger needs the camera to see. */
  requires: 'hand' | 'face';
  phase: 1 | 2;
  status: 'planned';
}

export const triggerRegistry: readonly TriggerDefinition[] = [
  {
    id: 'thumbs-up',
    name: 'Thumbs-up',
    description: 'Your hand must be clearly visible. A manual fallback button will be provided.',
    requires: 'hand',
    phase: 1,
    status: 'planned',
  },
  {
    id: 'open-mouth',
    name: 'Open mouth',
    description: 'Treated as a movement cue only. It says nothing about how you feel.',
    requires: 'face',
    phase: 1,
    status: 'planned',
  },
  {
    id: 'head-tilt',
    name: 'Head tilt',
    description: 'Measured against a neutral baseline so it does not flicker.',
    requires: 'face',
    phase: 2,
    status: 'planned',
  },
  {
    id: 'raise-hand',
    name: 'Raise hand',
    description: 'Anchors an overlay to your hand and tracks its position.',
    requires: 'hand',
    phase: 2,
    status: 'planned',
  },
];

/** The rule-building steps the Gesture Lab will guide people through. */
export const ruleSteps: readonly { title: string; body: string }[] = [
  { title: 'Choose a trigger', body: 'Pick a movement Memisite can detect, such as a thumbs-up.' },
  { title: 'Choose a response', body: 'Show a sticker, switch a filter or display a caption.' },
  { title: 'Tune it', body: 'Set sensitivity, hold time and cooldown. Defaults are safe.' },
  { title: 'Test it live', body: 'See whether the trigger was detected before you rely on it.' },
  { title: 'Save the rule', body: 'Keep it as a preset on this device. Nothing is uploaded.' },
];
