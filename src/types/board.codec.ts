import * as io from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { Board as BoardType } from './board.type';
import { Color as ColorCodec } from './color.codec';
import { Color as ColorType } from './color.type';
import _ from 'lodash';

/**
 * Filters a list of either to 2 lists of lefts and rights
 * @param {Either<L, R>[]} a list of eithers to filter
 * @return {object} an object containing the lefts and the rights
 */
function filter<L, R>(a: Either<L, R>[]): { left: L[]; right: R[] } {
  return a.reduce(
    (result: { left: L[]; right: R[] }, c) => {
      if (c._tag === 'Left') result.left.push(c.left);
      else if (c._tag === 'Right') result.right.push(c.right);
      return result;
    },
    { left: [], right: [] }
  );
}

export const Board = new io.Type<BoardType, string[][], unknown>(
  'Board',
  (u: unknown): u is BoardType => {
    if (Array.isArray(u)) {
      return _.every(u, row => {
        if (Array.isArray(row)) {
          if (row.length === u.length) {
            return _.every(row, c => ColorCodec.is(c));
          } else return false;
        } else return false;
      });
    } else return false;
  },
  (i: unknown, context: io.Context) => {
    if (Array.isArray(i)) {
      const board: Either<io.Errors, ColorType[]>[] = _.map(i, (r, index) => {
        if (Array.isArray(r)) {
          if (r.length === i.length) {
            const row: Either<io.Errors, ColorType>[] = _.map(r, c =>
              ColorCodec.decode(c)
            );
            const result = filter(row);
            if (result.left.length > 0)
              return io.failure(
                i,
                context,
                result.left.map(error => error.toString).join(',')
              );
            return io.success(result.right);
          } else
            return io.failure(
              i,
              context,
              `Row#${index} does not have the same length as the columns`
            );
        } else return io.failure(i, context, `Row#${index} is not an array`);
      });
      const result = filter(board);
      if (result.left.length > 0)
        return io.failure(
          i,
          context,
          result.left.map(error => error.toString).join(',')
        );
      return io.success(result.right);
    } else return io.failure(i, context, 'Input is not an array');
  },
  (a: BoardType) => a
);
