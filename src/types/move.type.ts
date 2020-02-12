import * as io from 'io-ts';
import * as c from './move.codec';

export type Move = io.TypeOf<typeof c.Move>;
