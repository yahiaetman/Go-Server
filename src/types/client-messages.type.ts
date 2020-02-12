import * as io from 'io-ts';
import * as c from './client-messages.codec';

export type NameMessage = io.TypeOf<typeof c.NameMessage>;

export type MoveMessage = io.TypeOf<typeof c.MoveMessage>;

export type ClientMessage = io.TypeOf<typeof c.ClientMessage>;
