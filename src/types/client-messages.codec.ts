import * as io from 'io-ts';
import * as ioe from './io-ts.extensions'
import { Move } from './move.codec';

export const NameMessage = io.interface({
    type: io.literal("NAME"),
    name: io.string,
    protocol: ioe.withDefault(io.string, "v1")
});

export const MoveMessage = io.interface({
    type: io.literal("MOVE"),
    move: Move
});

export const ClientMessage = io.union([
    NameMessage,
    MoveMessage
]);