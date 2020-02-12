import * as io from 'io-ts';
import * as t from './time.type';
import * as utils from './time.utils';

export const Time = new io.Type<t.Time, string, unknown>(
  'Time',
  (u: any): u is t.Time => typeof u === 'number',
  (i: unknown, c: io.Context) => {
    if (typeof i === 'string') {
      const o = utils.parse(i);
      return o !== null
        ? io.success(o)
        : io.failure(i, c, `Cannot parse ${i} to time`);
    } else if (typeof i === 'number') {
      return io.success(i);
    } else return io.failure(i, c, `Input ${i} is not a string or a number`);
  },
  (a: t.Time): string => utils.format(a)
);
