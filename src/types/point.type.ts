import * as io from 'io-ts';
import * as c from './point.codec';

export type Point = io.TypeOf<typeof c.Point>;