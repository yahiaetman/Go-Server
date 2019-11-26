import * as io from 'io-ts';
import { Move } from './move.codec';

export const NameMessage = io.interface({
    type: io.literal("NAME"),
    name: io.string
});

export const MoveMessage = io.interface({
    type: io.literal("MOVE"),
    move: Move
});

export const ClientMessage = io.union([
    NameMessage,
    MoveMessage
]);