import * as io from 'io-ts';
import * as t from './game-state.type';
import { Color as ColorCodec, Color } from './color.codec';
import { Color as ColorType } from './color.type';
import { Board as BoardCodec } from './board.codec';
import { Board as BoardType } from './board.type';
import * as BoardUtility from './board.utils';
import { PlayerState as PlayerStateCodec } from './player-state.codec';
import { PlayerState as PlayerStateType } from './player-state.type';

export const GameState = new io.Type<t.GameState, any, unknown>(
  'GameState',
  (u: any): u is t.GameState => {
    const g = u as t.GameState;
    return (
      g.board &&
      BoardCodec.is(g.board) &&
      g.players &&
      ColorType.BLACK in g.players &&
      PlayerStateCodec.is(g.players[ColorType.BLACK]) &&
      ColorType.WHITE in g.players &&
      PlayerStateCodec.is(g.players[ColorType.WHITE]) &&
      g.turn &&
      ColorCodec.is(g.turn)
    );
  },
  (i: unknown, c: io.Context) => {
    if (i && typeof i === 'object' && i !== null) {
      const obj: { board: unknown; players: unknown; turn: unknown } = i as {
        board: unknown;
        players: unknown;
        turn: unknown;
      };
      let turn: ColorType;
      if (obj.turn) {
        const result = ColorCodec.decode(obj.turn);
        if (result._tag === 'Left') return result;
        else turn = result.right;
      } else {
        turn = ColorType.BLACK;
      }
      let players: { [index: string]: PlayerStateType };
      if (obj.players) {
        if (typeof obj.players === 'object' && obj.players !== null) {
          const p: { [index: string]: unknown } = obj.players as {
            [index: string]: unknown;
          };
          if (ColorType.BLACK in p && ColorType.WHITE in p) {
            const black = PlayerStateCodec.decode(p[ColorType.BLACK]);
            const white = PlayerStateCodec.decode(p[ColorType.WHITE]);
            if (black._tag === 'Left') return black;
            if (white._tag === 'Left') return white;
            players = {
              [ColorType.BLACK]: black.right,
              [ColorType.WHITE]: white.right
            };
          } else {
            const result = PlayerStateCodec.decode(p);
            if (result._tag == 'Left') return result;
            else
              players = {
                [ColorType.BLACK]: result.right,
                [ColorType.WHITE]: result.right
              };
          }
        } else return io.failure(i, c, 'Players must be a dictionary');
      } else {
        return io.failure(i, c, 'Cannot find players info in state');
      }
      let board: BoardType;
      if (obj.board) {
        if (Array.isArray(obj.board)) {
          const result = BoardCodec.decode(obj.board);
          if (result._tag === 'Left') return result;
          else board = result.right;
        } else if (typeof obj.board === 'number') {
          if (Number.isInteger(obj.board)) {
            board = BoardUtility.getEmptyBoard(obj.board);
          } else
            return io.failure(
              i,
              c,
              `Board size must be an integer, value received is ${obj.board}`
            );
        } else {
          return io.failure(
            i,
            c,
            `Board must be either a 2D array or Integer, value received is ${obj.board}`
          );
        }
      } else {
        board = BoardUtility.getEmptyBoard(19);
      }
      return io.success({ turn: turn, players: players, board: board });
    } else return io.failure(i, c, `Input '${i}' is not an object`);
  },
  (a: t.GameState) => a
);
