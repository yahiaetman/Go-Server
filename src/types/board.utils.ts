import { Board } from './board.type';
import { Color } from './color.type';
import _ from 'lodash';

export function getEmptyBoard(size: number): Board {
    return _.times(size, ()=>_.times(size, ()=>Color.NONE));
}