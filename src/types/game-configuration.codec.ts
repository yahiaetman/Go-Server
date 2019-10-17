import * as io from 'io-ts';
import * as ioe from './io-ts.extensions';
import { GameState } from './game-state.codec';
import { Color } from './color.codec';
import { Move } from './move.codec';

export const EndGameInfo = io.interface({
    winner: Color,
    reason: io.union([io.literal('resign'), io.literal('pass'), io.literal('timeout')]),
    scores: io.record(io.string, io.number) 
}, 'EndGameInfo');

export const LogEntry = io.intersection([
    io.type({
        deltaTime: ioe.withDefault(io.number, 0)
    }),
    io.partial({
        move: Move,
        end: EndGameInfo
    })
]);

export const GameConfiguration = io.interface({
    initialState: GameState,
    moveLog: ioe.withDefault(io.array(LogEntry), []),
    komi: ioe.withDefault(io.number, 6.5),
    ko: ioe.withDefault(io.boolean, true),
    scoringMethod: ioe.withDefault(io.union([io.literal('area'), io.literal('territory')]), 'area'),
    prisonerScore: ioe.withDefault(io.number, 1)
}, 'GameConfiguration');