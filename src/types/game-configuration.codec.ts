import * as io from 'io-ts';
import * as ioe from './io-ts.extensions';
import { GameState } from './game-state.codec';
import { Color } from './color.codec';
import { Move } from './move.codec';
import { Time } from './time.codec';

export const EndGameInfo = io.interface({
    winner: Color,
    reason: io.union([io.literal('resign'), io.literal('pass'), io.literal('timeout'), io.literal('mercy')]),
    scores: io.record(io.string, io.number) 
}, 'EndGameInfo');

export const LogEntry = io.intersection([
    io.type({
        deltaTime: ioe.withDefault(Time, 0)
    }),
    io.partial({
        move: Move,
        end: EndGameInfo
    })
]);

export const GameConfiguration = io.interface({
    initialState: GameState,
    moveLog: ioe.withDefault(io.array(LogEntry), []),
    idleDeltaTime: ioe.withDefault(Time, 0),
    komi: ioe.withDefault(io.number, 6.5),
    ko: ioe.withDefault(io.boolean, true),
    superko: ioe.withDefault(io.boolean, false),
    mercy: ioe.withDefault(io.number, 0),
    mercyStart: ioe.withDefault(io.number, 100),
    scoringMethod: ioe.withDefault(io.union([io.literal('area'), io.literal('territory')]), 'area'),
    prisonerScore: ioe.withDefault(io.number, 1)
}, 'GameConfiguration');