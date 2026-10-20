import type { StateColors, StateLabels } from './types';

/** Fallback color per state, for the glow, the pill and the orb. */
export const DEFAULT_STATE_COLORS: Required<StateColors> = {
  idle: '#4b5563',
  listening: '#3b82f6',
  thinking: '#8b5cf6',
  speaking: '#10b981',
  working: '#f59e0b',
};

/** Fallback pill text per state. */
export const DEFAULT_STATE_LABELS: Required<StateLabels> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking...',
  speaking: 'Speaking',
  working: 'Working',
};
