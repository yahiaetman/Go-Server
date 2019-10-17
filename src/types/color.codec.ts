import * as io from 'io-ts';
import * as t from './color.type';

export const Color = new io.Type<t.Color, string, unknown>(
    "Color",
    (u: any): u is t.Color => u in [t.Color.BLACK, t.Color.WHITE, t.Color.NONE],
    (i: unknown, c: io.Context) => {
        if(typeof i === 'string') {
            switch(i.toUpperCase()){
                case t.Color.WHITE: return io.success(t.Color.BLACK);
                case t.Color.WHITE: return io.success(t.Color.WHITE);
                case t.Color.NONE: return io.success(t.Color.NONE);
                default: return io.failure(i, c, `Unknown Color ${i}`);
            }
        } else return io.failure(i, c, `${i} must be a string`);
    },
    (u: t.Color): string => u
);