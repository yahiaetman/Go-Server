import { Point } from './point.type';
import { number } from 'io-ts';

export class PointUtility {
    private static columnLabels: string[] = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    public static get ColumnLabels(): string[] {
        return PointUtility.columnLabels;
    }

    public static Format(point: Point): string {
        return `${PointUtility.columnLabels[point.column]}${point.row+1}`;
    }

    public static Parse(input: string): Point | null {
        const matches = /^\s*([A-Z])\s*([0-9]+)\s*$/.exec(input.trim().toUpperCase());
        if(matches == null) return null;
        let column = PointUtility.columnLabels.findIndex((v) => v===matches[1]);
        let row = Number.parseInt(matches[2]) - 1;
        if(row < 0 || Number.isNaN(row) || column < 0) return null;
        return {row: row, column: column};
    }
};