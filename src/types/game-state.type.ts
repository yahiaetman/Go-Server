import { Color } from './color.type';
import { Board } from './board.type';
import { PlayerState } from './player-state.type';

export interface GameState {
  board: Board;
  players: { [index: string]: PlayerState };
  turn: Color;
}
