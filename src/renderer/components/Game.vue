<template>
    <div class="game-container">
        <div class="game-board">
            <board></board>
        </div>
        <div class="game-score score1">
            <div class="score-title">SCORE</div>
            <div class="score-value">392.0</div>
            <div class="prisoners">No Prisoners</div>
            <div>
                <i class="material-icons md-dark">
                    stars
                </i>
            </div>
        </div>
        <div class="game-score score2">
            <div class="score-title">SCORE</div>
            <div class="score-value">182.5</div>
            <div class="prisoners">1 Prisoner</div>
            <div>
                <i class="material-icons md-dark">
                    stars
                </i>
            </div>
        </div>
        <div class="game-control">
            <div class="game-info1">
                <color-tag color="B"></color-tag>
                <div class="player-name">Thomson Reuter</div>
                <hr class="info-line">
                <div>
                    <span class="player-time">99:99:99.999</span>
                    <div class="dot-bricks player-thinking"></div>
                </div>
                <button class="disconnect-button">
                    <i class="material-icons md-dark" v-show="true">refresh</i>
                    <span>DISCONNECT (127.999.256.101)</span>
                </button>
            </div>
            <div class="game-info2">
                <color-tag color="W"></color-tag>
                <div class="player-name">Thomson Reuter</div>
                <hr class="info-line">
                <div>
                    <div class="dot-bricks player-thinking"></div>
                    <span class="player-time">00:24:12.012</span>
                </div>
                <button class="disconnect-button">
                    <i class="material-icons md-dark" v-show="true">refresh</i>
                    <span>DISCONNECT (127.999.256.101)</span>
                </button>
            </div>
            <div class="game-control-center">
                <button class="big-round-button center-button">
                    <i class="material-icons">play_arrow</i>
                </button>
                <button class="small-round-button left-button" tooltip="Swap Players" data-tooltipleft="-50px">
                    <i class="material-icons">swap_horiz</i>
                </button>
                <button class="small-round-button right-button"  tooltip="Clear Board">
                    <i class="material-icons">clear_all</i>
                </button>
                <div class="game-time">99:99:99</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import BoardComponent from './Board.vue';
import ColorTagComponent from './ColorTag.vue';

@Component({
    components : {
        'board': BoardComponent,
        'color-tag': ColorTagComponent
    }
})
export default class GameComponent extends Vue {
}
</script>

<style lang="scss" scoped>
@import '../common.scss';

.game-container {
    margin: 24px 24px;
    display: grid;
    grid-template-columns: 185px 530px 185px;
    grid-template-rows: 470px 160px;
    grid-template-areas:
    'score1 board score2'
    'control control control';
}

.game-board {
    grid-area: board;
}

.game-score {
    background-color: transparent;
}

.game-score.score1 {
    grid-area: score1;
    text-align: left;
}


.game-score.score2 {
    grid-area: score2;
    text-align: right;
}

.score-title {
    font-size: 24px;
}
.score-value {
    font-size: 48px;
    font-weight: bold;
}
.prisoners {
    font-size: 24px;
}

.game-control {
    grid-area: control;
    display: grid;
    grid-template-columns: 350px 200px 350px;
    grid-template-areas:
    'info1 center info2';
}

.game-info1 {
    grid-area: info1;
    text-align: left;
}

.game-info2 {
    grid-area: info2;
    text-align: right;
}

.player-name {
    font-size: 48px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $color1;
}

.info-line {
    border: 0.5px solid $color2;
}

.player-time {
    font-size: 36px;
    color: $color1;
    width: 240px;
}

.game-time {
    position: absolute;
    font-size: 16px;
    font-weight: bold;
    color: $color1;
    width: 80px;
    bottom: 0px;
    left: 60px;
    text-align: center;
}

.player-thinking {
    display: inline-block;
    margin-top: -8px;
    margin-bottom: 8px;
    margin-left: 32px;
    margin-right: 32px;
    background-color: $color1;
    color: $color1;
}

.disconnect-button {
    font-size: 16px;
    border: none;
    background-color: $color3;
    color: $color2;
    border-radius: 10px;
    padding: 6px 16px 6px 8px;
    outline: none;
    user-select: none;
    cursor: pointer;
}

.disconnect-button > span {
    margin-right: 8px;
    vertical-align: middle !important;
}

.disconnect-button > i {
    font-size: 18px;
    margin-bottom: 2px;
    vertical-align: middle !important;
    animation-name: rotation;
    animation-duration: 1s;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
}

.disconnect-button:hover {
    box-shadow: 0px 0px 5px 0px #00000044;
    color: $color1;
}

.disconnect-button:active {
    box-shadow: 0px 0px 3px 0px #00000044;
    color: $color1;
}

.game-control-center {
    grid-area: center;
    position: relative;
}

.big-round-button {
    border: none;
    outline: none;
    width: 120px;
    height: 120px;
    border-radius: 60px;
    background-color: $color1;
    color: $color4;
    padding: 0;
    text-align: center;
    user-select: none;
    cursor: pointer;
}
.big-round-button:hover:enabled {
    box-shadow: 0px 0px 16px 0px #00000044;
    color: $color5;
}
.big-round-button:active:enabled {
    box-shadow: 0px 0px 8px 0px #00000044;
    color: $color5;
}
.big-round-button:disabled {
    background-color: $color2;
    color: $color4;
}
.big-round-button > i {
    font-size: 96px;
    margin: 0;
    margin-top: 8px;
}
.center-button {
    position: absolute;
    top: 16px;
    left: 40px;
}
.small-round-button {
    border: none;
    outline: none;
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background-color: $color1;
    color: $color4;
    text-align: center;
    padding: 0;
    user-select: none;
    cursor: pointer;
}
.small-round-button:hover:enabled {
    box-shadow: 0px 0px 12px 0px #00000044;
    color: $color5;
}
.small-round-button:active:enabled {
    box-shadow: 0px 0px 6px 0px #00000044;
    color: $color5;
}
.small-round-button:disabled {
    background-color: $color2;
    color: $color4;
}
.small-round-button > i {
    font-size: 32px;
    margin: 0;
    margin-top: 4px;
}
.left-button {
    position: absolute;
    bottom: 0px;
    left: 12px;
}
.right-button {
    position: absolute;
    bottom: 0px;
    right: 12px;
}

</style>