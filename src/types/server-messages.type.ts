import * as io from 'io-ts';
import * as c from './server-messages.codec';

export type NameMessage = io.TypeOf<typeof c.NameMessage>;

export type StartMessage = io.TypeOf<typeof c.StartMessage>;

export type MoveMessage = io.TypeOf<typeof c.MoveMessage>;

export type ValidMessage = io.TypeOf<typeof c.ValidMessage>;

export type InvalidMessage = io.TypeOf<typeof c.InvalidMessage>;

export type EndMessage = io.TypeOf<typeof c.EndMessage>;

export type ServerMessage = io.TypeOf<typeof c.ServerMessage>;
