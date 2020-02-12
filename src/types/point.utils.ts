import { Point } from './point.type';
import { number } from 'io-ts';

/**
 * A Utility class for Points
 * @class
 */
export class PointUtility {
  private static columnLabels: string[] = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
  ];

  /**
   * Gets column labels
   * @static
   * @return {string[]} column labels
   */
  public static get ColumnLabels(): string[] {
    return PointUtility.columnLabels;
  }

  /**
   * Formats a point to string
   * @param {Point} point the point to format
   * @return {string} the formated point as a string
   */
  public static format(point: Point): string {
    return `${PointUtility.columnLabels[point.column]}${point.row + 1}`;
  }

  /**
   * Parse a string into a point
   * @param {string} input the string to parse
   * @return {Point | null} the parsed point if parsing was successful, null otherwise
   */
  public static parse(input: string): Point | null {
    const matches = /^\s*([A-Z])\s*([0-9]+)\s*$/.exec(
      input.trim().toUpperCase()
    );
    if (matches == null) return null;
    const column = PointUtility.columnLabels.findIndex(v => v === matches[1]);
    const row = Number.parseInt(matches[2]) - 1;
    if (row < 0 || Number.isNaN(row) || column < 0) return null;
    return { row: row, column: column };
  }
}
