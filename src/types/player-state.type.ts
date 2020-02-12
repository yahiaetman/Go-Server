import * as io from 'io-ts';
import * as c from './player-state.codec';

export type PlayerState = io.TypeOf<typeof c.PlayerState>;
