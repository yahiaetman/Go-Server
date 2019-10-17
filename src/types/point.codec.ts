import * as io from 'io-ts';

export const Point = io.interface({
    row: io.number,
    column: io.number
});