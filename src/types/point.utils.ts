import { Point } from './point.type';

export class PointUtility {
    private static columnLabels: string[] = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T'];

    public static get ColumnLabels(): string[] {
        return PointUtility.columnLabels;
    }

    public static Format(point: Point): string {
        return `${PointUtility.columnLabels[point.column]}${point.row+1}`;
    }
};