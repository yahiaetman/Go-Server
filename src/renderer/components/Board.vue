<template>
  <div class="board-container">
    <svg class="graphics-container">
      <defs>
        <filter id="shadow" x="0" y="0" width="200%" height="200%">
          <feOffset result="offOut" in="SourceAlpha" dx="2" dy="2" />
          <feColorMatrix
            result="matrixOut"
            in="offOut"
            type="matrix"
            values="0.3 0 0 0 0  0 0.3 0 0 0  0 0 0.3 0 0  0 0 0 0.3 0"
          />
          <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="1" />
        </filter>
      </defs>
      <g>
        <line
          v-for="i in Height"
          :key="i"
          :x1="BoardStart.x + (i - 1) * BoardDelta"
          :y1="BoardStart.y"
          :x2="BoardStart.x + (i - 1) * BoardDelta"
          :y2="BoardStart.y + BoardSize.y"
          class="board-line"
        />
      </g>
      <g>
        <line
          v-for="i in Width"
          :key="i"
          :x1="BoardStart.x"
          :y1="BoardStart.y + (i - 1) * BoardDelta"
          :x2="BoardStart.x + BoardSize.x"
          :y2="BoardStart.y + (i - 1) * BoardDelta"
          class="board-line"
        />
      </g>
      <g>
        <circle
          v-for="point in HandicapPoints"
          :key="`Point(${point.row},${point.column})`"
          :cx="BoardStart.x + point.column * BoardDelta"
          :cy="BoardStart.y + point.row * BoardDelta"
          :r="BoardDelta / 4"
          class="board-point"
        />
      </g>
      <g>
        <g>
          <text
            v-for="i in Width"
            :key="i"
            :x="BoardStart.x + (i - 1) * BoardDelta"
            :y="BoardStart.y - TextMargin"
            class="board-label"
          >
            {{ getColumnName(i - 1) }}
          </text>
        </g>
        <g>
          <text
            v-for="i in Width"
            :key="i"
            :x="BoardStart.x + (i - 1) * BoardDelta"
            :y="BoardStart.y + BoardSize.y + TextMargin"
            class="board-label"
          >
            {{ getColumnName(i - 1) }}
          </text>
        </g>
        <g>
          <text
            v-for="i in Height"
            :key="i"
            :y="BoardStart.y + (i - 1) * BoardDelta"
            :x="BoardStart.x - TextMargin"
            class="board-label"
          >
            {{ i }}
          </text>
        </g>
        <g>
          <text
            v-for="i in Height"
            :key="i"
            :y="BoardStart.y + (i - 1) * BoardDelta"
            :x="BoardStart.x + BoardSize.x + TextMargin"
            class="board-label"
          >
            {{ i }}
          </text>
        </g>
      </g>
      <g>
        <g>
          <circle
            v-for="stone in Stones"
            :key="stone.key"
            :cx="BoardStart.x + BoardDelta * stone.position.column"
            :cy="BoardStart.y + BoardDelta * stone.position.row"
            :r="BoardDelta / 2"
            filter="url(#shadow)"
          />
        </g>
        <g>
          <circle
            v-for="stone in Stones"
            :key="stone.key"
            :cx="BoardStart.x + BoardDelta * stone.position.column"
            :cy="BoardStart.x + BoardDelta * stone.position.row"
            :r="BoardDelta / 2"
            :class="[stone.class]"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as _ from 'lodash';
import { Component, Prop } from 'vue-property-decorator';
import { Point, Color } from '../../types/types';
import { PointUtility } from '../../types/point.utils';

const BOARD_MARGIN = 50;
const MAX_DELTA = 20;
const SIZE = 460;
const TEXT_MARGIN = 20;

@Component
/**
 * Board Component Class
 * @class
 */
export default class BoardComponent extends Vue {
  fixedHandicapPoints: Point[] = [
    { row: 3, column: 3 },
    { row: 3, column: 9 },
    { row: 3, column: 15 },
    { row: 9, column: 3 },
    { row: 9, column: 9 },
    { row: 9, column: 15 },
    { row: 15, column: 3 },
    { row: 15, column: 9 },
    { row: 15, column: 15 }
  ];

  // eslint-disable-next-line new-cap
  @Prop({ default: [] })
  board!: Color[][];

  /**
   * Gets the column name
   * @param {number} index Column index
   * @return {string} the column name
   */
  getColumnName(index: number): string {
    return PointUtility.ColumnLabels[index];
  }

  /**
   * Gets the stones on the board
   * @return {object[]}
   */
  get Stones(): { key: string; position: Point; class: string }[] {
    let stones = _.flatMap(this.board, (arr, row) =>
      _.map(arr, (cell, column) => {
        return {
          key: `(${row},${column})`,
          position: { row: row, column: column },
          class: cell === '.' ? '.' : cell === 'B' ? 'black' : 'white'
        };
      })
    );
    stones = _.filter(stones, stone => stone.class !== '.');
    return stones;
  }

  /**
   * Gets the Width of the board
   * @return {number}
   */
  get Width(): number {
    return this.board.length == 0 ? 0 : this.board[0].length;
  }

  /**
   * Gets the Height of the board
   * @return {number}
   */
  get Height(): number {
    return this.board.length;
  }

  /**
   * Gets the board size
   * @return {object}
   */
  get BoardSize(): { x: number; y: number } {
    let pxW = (this.Width - 1) * MAX_DELTA;
    let pxH = (this.Height - 1) * MAX_DELTA;
    const pxMax = Math.max(pxW, pxH);
    const maxS = SIZE - 2 * BOARD_MARGIN;
    if (pxMax > maxS) {
      pxW = Math.floor((pxW * maxS) / pxMax);
      pxH = Math.floor((pxH * maxS) / pxMax);
    }
    return { x: pxW, y: pxH };
  }

  /**
   * Gets the board top left corner
   * @return {object}
   */
  get BoardStart(): { x: number; y: number } {
    const size = this.BoardSize;
    return { x: (SIZE - size.x) / 2, y: (SIZE - size.y) / 2 };
  }

  /**
   * Gets the distance between 2 points
   * @return {number}
   */
  get BoardDelta(): number {
    return this.BoardSize.y / (this.Height - 1);
  }
  /**
   * Gets the text margin
   * @return {number}
   */
  get TextMargin(): number {
    return TEXT_MARGIN;
  }

  /**
   * Gets the locations of the handicap points
   * @return {Point[]}
   */
  get HandicapPoints(): Point[] {
    let points: Point[];
    const size = this.Height;
    if (size < 7 || size != this.Width) return [];
    const edge = size >= 13 ? 4 : 3;
    if (size == 7 || size % 2 == 0) {
      points = [
        { row: edge - 1, column: edge - 1 },
        { row: size - edge, column: edge - 1 },
        { row: edge - 1, column: size - edge },
        { row: size - edge, column: size - edge }
      ];
    } else {
      const center = (size - 1) / 2;
      points = [
        { row: edge - 1, column: edge - 1 },
        { row: center, column: edge - 1 },
        { row: size - edge, column: edge - 1 },

        { row: edge - 1, column: center },
        { row: center, column: center },
        { row: size - edge, column: center },

        { row: edge - 1, column: size - edge },
        { row: center, column: size - edge },
        { row: size - edge, column: size - edge }
      ];
    }
    return points;
  }
}
</script>

<style lang="scss" scoped>
@import '../common.scss';

.board-container {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background-color: $color3;
  box-shadow: inset 1px 1px 5px 0px #00000033;
}

.graphics-container {
  width: 460px;
  height: 460px;
  margin: 5px 35px;
}

.board-line {
  stroke: $color2;
  stroke-width: 2px;
}

.board-point {
  fill: $color2;
}

.board-label {
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: 16px;
  fill: $color2;
}

.black {
  fill: $color1;
}

.white {
  fill: $color5;
}
</style>
