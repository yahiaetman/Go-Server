import * as io from 'io-ts';
import { Move } from './move.codec';
import { GameConfiguration } from './game-configuration.codec';
import { Color } from './color.codec';
import { Time } from './time.codec';

const RemainingTime = io.record(Color, Time);

export const NameMessage = io.interface({
    type: io.literal("NAME")
});

export const StartMessage = io.interface({
    type: io.literal("START"),
    configuration: GameConfiguration,
    color: Color
});

export const MoveMessage = io.interface({
    type: io.literal("MOVE"),
    move: Move,
    remainingTime: RemainingTime
});

export const ValidMessage = io.interface({
    type: io.literal("VALID"),
    remainingTime: RemainingTime
});

export const InvalidMessage = io.interface({
    type: io.literal("INVALID"),
    message: io.string,
    remainingTime: RemainingTime
});

export const EndMessage = io.interface({
    type: io.literal("END"),
    reason: io.union([io.literal('resign'), io.literal('pass'), io.literal('timeout'), io.literal('pause'), io.literal('error')]),
    winner: Color,
    players: io.record(Color, io.interface({
        remainingTime: Time,
        score: io.number
    }))
});

export const ServerMessage = io.union([
    NameMessage,
    StartMessage,
    MoveMessage,
    ValidMessage,
    InvalidMessage,
    EndMessage
]);