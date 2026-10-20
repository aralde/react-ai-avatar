import { createContext, useContext } from 'react';
import type { AvatarState } from './types';

/**
 * The state of the nearest `RealtimeAvatar` / `VideoAvatar`. Lets a face
 * rendered as `children` (the `byos` path) follow the avatar without the host
 * passing `state` twice.
 */
export const AvatarStateContext = createContext<AvatarState | null>(null);

/**
 * The state a face should render: its own `state` prop when given, else the
 * enclosing avatar's, else `'idle'`.
 */
export function useAvatarState(own?: AvatarState): AvatarState {
  const inherited = useContext(AvatarStateContext);
  return own ?? inherited ?? 'idle';
}
