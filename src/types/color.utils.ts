import { Color } from './color.type';

/**
 * Flips the color (None return None)
 * @param {Color} color the input color
 * @return {Color} the flipped color
 */
export function flipColor(color: Color): Color {
  return color === Color.NONE
    ? Color.NONE
    : color == Color.BLACK
    ? Color.WHITE
    : Color.BLACK;
}
