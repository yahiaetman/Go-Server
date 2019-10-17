import * as io from 'io-ts';
import { Time } from './time.codec';
import * as ioe from './io-ts.extensions';

export const PlayerState = io.type({
    remainingTime: Time,
    prisoners: ioe.withDefault(io.number, 0)
}, 'PlayerState');