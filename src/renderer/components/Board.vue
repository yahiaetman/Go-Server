<template>
    <div class="board-container">
        <svg class="graphics-container">
            <defs>
                <filter id="shadow" x="0" y="0" width="200%" height="200%">
                    <feOffset result="offOut" in="SourceAlpha" dx="2" dy="2" />
                    <feColorMatrix result="matrixOut" in="offOut" type="matrix" values="0.3 0 0 0 0  0 0.3 0 0 0  0 0 0.3 0 0  0 0 0 0.3 0" />
                    <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="1" />
                </filter>
            </defs>
            <g>
                <line v-for="i in 19" :key="i" :x1="30+i*20" :y1="50" :x2="30+i*20" :y2="50+18*20" class="board-line"/>
            </g>
            <g>
                <line v-for="i in 19" :key="i" :x1="50" :y1="30+i*20" :x2="50+18*20" :y2="30+i*20" class="board-line"/>
            </g>
            <g>
                <circle v-for="point in fixedHandicapPoints" :key="`Point(${point.row},${point.column})`" :cx="50+point.column*20" :cy="50+point.row*20" r="6" class="board-point"/>
            </g>
            <g>
                <g>
                    <text v-for="i in 19" :key="i" :x="30+i*20" :y="30" class="board-label">{{getColumnName(i-1)}}</text>
                </g>
                <g>
                    <text v-for="i in 19" :key="i" :x="30+i*20" :y="50+18*20+35" class="board-label">{{getColumnName(i-1)}}</text>
                </g>
                <g>
                    <text v-for="i in 19" :key="i" :y="30+i*20+5" :x="50-35" class="board-label">{{i}}</text>
                </g>
                <g>
                    <text v-for="i in 19" :key="i" :y="30+i*20+5" :x="50+18*20+35" class="board-label">{{i}}</text>
                </g>
            </g>
            <g>
                <g>
                    <circle v-for="stone in Stones" :key="stone.key" :cx="50+20*stone.position.column" :cy="50+20*stone.position.row" r="10" filter="url(#shadow)"/>
                </g>
                <g>
                    <circle v-for="stone in Stones" :key="stone.key" :cx="50+20*stone.position.column" :cy="50+20*stone.position.row" r="10" :class="[stone.class]"/>
                </g>
            </g>
        </svg>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as _ from 'lodash';
import { Component, Prop } from 'vue-property-decorator';
import Point, { PointUtility } from '../../types/point';

@Component
export default class BoardComponent extends Vue {
    fixedHandicapPoints: Point[] = [
        {row: 3, column: 3},
        {row: 3, column: 9},
        {row: 3, column: 15},
        {row: 9, column: 3},
        {row: 9, column: 9},
        {row: 9, column: 15},
        {row: 15, column: 3},
        {row: 15, column: 9},
        {row: 15, column: 15}
    ]

    board: string[][] = [
        ['B','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','B','B','B','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','W','B','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','W','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','B','.','W','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
        ['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','.','W']
    ]

    getColumnName(index: number): string {
        return PointUtility.ColumnLabels[index];
    }

    get Stones(): {key:string, position:Point, class:string}[] {
        let stones = _.flatMap(this.board, (arr, row)=>_.map(arr, (cell, column)=>{
            return {key:`(${row},${column})`, position:{row:row, column:column}, class:cell==='.'?'.':cell==='B'?'black':'white'};
        }));
        stones = _.filter(stones, (stone)=>stone.class!=='.');
        return stones;
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