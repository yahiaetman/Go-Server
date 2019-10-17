import * as io from 'io-ts';
import * as c from './game-configuration.codec';

export type EndGameInfo = io.TypeOf<typeof c.EndGameInfo>;

export type LogEntry = io.TypeOf<typeof c.LogEntry>;

export type GameConfiguration = io.TypeOf<typeof c.GameConfiguration>;