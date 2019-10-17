import { Color } from './color.type';

export function FlipColor(color: Color): Color {
    return color===Color.NONE?Color.NONE:(color==Color.BLACK?Color.WHITE:Color.BLACK);
}