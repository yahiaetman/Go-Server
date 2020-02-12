import * as io from 'io-ts';
import { Point } from './point.codec';

export const Move = io.union(
  [
    io.interface({
      type: io.union([io.literal('pass'), io.literal('resign')])
    }),
    io.interface({
      type: io.literal('place'),
      point: Point
    })
  ],
  'Move'
);
