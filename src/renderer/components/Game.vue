<template>
  <div class="game-container">
    <div class="game-board">
      <board :board="state.board"></board>
    </div>
    <div class="game-score score1">
      <div class="score-title">SCORE</div>
      <div class="score-value">{{ getPlayerScore('B') }}</div>
      <div class="prisoners">{{ getPlayerPrisoners('B') }}</div>
      <div>
        <i class="material-icons md-dark" v-show="winner == 'B'">
          stars
        </i>
      </div>
    </div>
    <div class="game-score score2">
      <div class="score-title">SCORE</div>
      <div class="score-value">{{ getPlayerScore('W') }}</div>
      <div class="prisoners">{{ getPlayerPrisoners('W') }}</div>
      <div>
        <i class="material-icons md-dark" v-show="winner == 'W'">
          stars
        </i>
      </div>
    </div>
    <div class="game-control">
      <div class="game-info1">
        <color-tag color="B"></color-tag>
        <div :class="['player-name', { none: !hasPlayer('B') }]">
          {{ getPlayerName('B') }}
        </div>
        <hr class="info-line" />
        <div>
          <span class="player-time">{{ getPlayerTime('B') }}</span>
          <div
            class="dot-bricks player-thinking"
            v-show="running && state.turn === 'B'"
          ></div>
        </div>
        <button
          class="leave-button"
          @click="leave('B')"
          :disabled="running || !hasPlayer('B')"
        >
          <i class="material-icons md-dark" v-show="!hasPlayer('B')">refresh</i>
          <span>{{
            hasPlayer('B') ? `LEAVE (${getPlayerAddress('B')})` : 'Waiting...'
          }}</span>
        </button>
      </div>
      <div class="game-info2">
        <color-tag color="W"></color-tag>
        <div :class="['player-name', { none: !hasPlayer('W') }]">
          {{ getPlayerName('W') }}
        </div>
        <hr class="info-line" />
        <div>
          <div
            class="dot-bricks player-thinking"
            v-show="running && state.turn === 'W'"
          ></div>
          <span class="player-time">{{ getPlayerTime('W') }}</span>
        </div>
        <button
          class="leave-button"
          @click="leave('W')"
          :disabled="running || !hasPlayer('W')"
        >
          <i class="material-icons md-dark" v-show="!hasPlayer('W')">refresh</i>
          <span>{{
            hasPlayer('W') ? `LEAVE (${getPlayerAddress('W')})` : 'Waiting...'
          }}</span>
        </button>
      </div>
      <div class="game-control-center">
        <button
          class="big-round-button center-button"
          :disabled="!bothPlayers"
          @click="start"
        >
          <i class="material-icons">{{ running ? 'pause' : 'play_arrow' }}</i>
        </button>
        <button
          class="small-round-button left-button"
          tooltip="Swap Players"
          data-tooltipleft="-50px"
          :disabled="running || !anyPlayer"
          @click="swap"
        >
          <i class="material-icons">swap_horiz</i>
        </button>
        <button
          class="small-round-button right-button"
          tooltip="Clear Board"
          :disabled="!canClear"
          @click="clear"
        >
          <i class="material-icons">clear</i>
        </button>
        <div class="game-time">{{ getTotalTime() }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import BoardComponent from './Board.vue';
import ColorTagComponent from './ColorTag.vue';
import { Client } from './renderer-types';
import { Color, GameState, Move } from '../../types/types';
import * as TimeUtility from '../../types/time.utils';

// eslint-disable-next-line new-cap
@Component({
  components: {
    board: BoardComponent,
    'color-tag': ColorTagComponent
  }
})
/**
 * The Game Component Class
 * @class
 */
export default class GameComponent extends Vue {
  // eslint-disable-next-line new-cap
  @Prop({ default: { [Color.BLACK]: null, [Color.WHITE]: null } })
  players!: { [name: string]: Client | null };

  // eslint-disable-next-line new-cap
  @Prop({ default: () => ({}) })
  state!: GameState;

  // eslint-disable-next-line new-cap
  @Prop({ default: () => ({ [Color.BLACK]: 0, [Color.WHITE]: 0 }) })
  scores!: { [name: string]: 0 };

  // eslint-disable-next-line new-cap
  @Prop({ default: false })
  canClear!: boolean;

  // eslint-disable-next-line new-cap
  @Prop({ default: false })
  ended!: boolean;

  // eslint-disable-next-line new-cap
  @Prop({ default: false })
  running!: boolean;

  // eslint-disable-next-line new-cap
  @Prop({ default: Color.NONE })
  winner!: Color;

  /**
   * Gets the name of a player
   * @param {Color} color the player's color
   * @return {string} the player name
   */
  getPlayerName(color: Color): string {
    const player = this.players[color];
    return player !== null
      ? player.name
      : color === Color.BLACK
      ? 'BLACK'
      : 'WHITE';
  }

  /**
   * Gets the address of a player
   * @param {Color} color the player's color
   * @return {string} the player address
   */
  getPlayerAddress(color: Color): string {
    const player = this.players[color];
    return player !== null ? player.address : '';
  }

  /**
   * Gets the remaining time for the player
   * @param {Color} color the player's color
   * @return {string} the player time
   */
  getPlayerTime(color: Color): string {
    return TimeUtility.format(this.state.players[color].remainingTime);
  }
  /**
   * Gets the total remaining time
   * @return {string} the total time
   */
  getTotalTime(): string {
    return TimeUtility.format(
      this.state.players[Color.BLACK].remainingTime +
        this.state.players[Color.WHITE].remainingTime
    );
  }

  /**
   * Gets the prisoners of a player
   * @param {Color} color the player's color
   * @return {string} the player prisoners
   */
  getPlayerPrisoners(color: Color): string {
    const prisoners = this.state.players[color].prisoners;
    return prisoners == 0
      ? 'No prisoners'
      : prisoners == 1
      ? 'One prisoner'
      : `${prisoners} prisoners`;
  }

  /**
   * Gets the score for the player
   * @param {Color} color the player's color
   * @return {number} the player score
   */
  getPlayerScore(color: Color): number {
    return this.scores[color];
  }

  /**
   * Gets whether there is a player with given color
   * @param {Color} color the player's color
   * @return {boolean} true if a player exists
   */
  hasPlayer(color: Color): boolean {
    return this.players[color] !== null;
  }

  /**
   * Gets whether any player exists
   * @return {boolean}
   */
  get anyPlayer(): boolean {
    return (
      this.players[Color.BLACK] !== null || this.players[Color.WHITE] !== null
    );
  }

  /**
   * Gets whether both players exists
   * @return {boolean}
   */
  get bothPlayers(): boolean {
    return (
      this.players[Color.BLACK] !== null && this.players[Color.WHITE] !== null
    );
  }

  /**
   * Request player to leave game
   * @param {Color} color the player's color
   */
  leave(color: Color) {
    const player = this.players[color];
    if (player != null) {
      this.$emit('leave', player.id);
    }
  }

  /**
   * Swap players
   */
  swap() {
    this.$emit('swap');
  }

  /**
   * Start/Stop game
   */
  start() {
    if (this.running) this.$emit('stop');
    else this.$emit('start');
  }

  /**
   * Clear checkpoint
   */
  clear() {
    this.$emit('clear');
  }
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
  grid-template-areas: 'info1 center info2';
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

.player-name.none {
  color: $color2;
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

.leave-button {
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

.leave-button > span {
  margin-right: 8px;
  vertical-align: middle !important;
}

.leave-button > i {
  font-size: 18px;
  margin-bottom: 2px;
  vertical-align: middle !important;
  animation-name: rotation;
  animation-duration: 1s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

.leave-button:hover {
  box-shadow: 0px 0px 5px 0px #00000044;
  color: $color1;
}

.leave-button:active {
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
