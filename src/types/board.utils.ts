import { Board } from './board.type';
import { Color } from './color.type';
import _ from 'lodash';

/**
 * Creates an empty board
 * @param {number} size the board size
 * @return {Board} the empty board
 */
export function getEmptyBoard(size: number): Board {
  return _.times(size, () => _.times(size, () => Color.NONE));
}
