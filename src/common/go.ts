import _ from 'lodash';
import {Color, Move, Board, LogEntry, GameState, GameConfiguration, Point} from '../types/types';
import * as ColorUtility from '../types/color.utils';
import {PointUtility} from '../types/point.utils';
import * as TimeUtility from '../types/time.utils';
import * as BoardUtility from '../types/board.utils';

export type HistoryEntry = {
    type: 'start',
    state: GameState
} | {
    type: 'move',
    state: GameState,
    move: Move
} | {
    type: 'end',
    state: GameState,
    info: EndGameInfo
};

export interface EndGameInfo {
    winner: Color,
    reason: 'resign' | 'pass' | 'timeout' | 'mercy',
    scores: {[index: string]:number}
}

export default class GoGame {
    private configuration!: GameConfiguration;
    private history!: HistoryEntry[];
    private idleDeltaTime!: number;

    constructor(configuration?: GameConfiguration) {
      this.Configuration = configuration || GoGame.DefaultConfiguration;
    }

    public set Configuration(configuration: GameConfiguration) {
      this.configuration = configuration;
      this.idleDeltaTime = configuration.idleDeltaTime;
      this.history = [{
        type: 'start',
        state: this.configuration.initialState,
      }];
      for (const entry of this.configuration.moveLog) {
        if (entry.move) {
          this.apply(entry.move, entry.deltaTime);
        } else if (entry.end) {
          const end = entry.end;
          const state = _.cloneDeep(this.CurrentState);
          state.players[state.turn].remainingTime -= entry.deltaTime;
          this.history.push({
            type: 'end',
            state: state,
            info: end,
          });
        }
      }
    }

    public get Configuration(): GameConfiguration {
      const config = _.cloneDeep(this.configuration);
      config.moveLog = [];
      config.idleDeltaTime = this.idleDeltaTime;
      let lastRemainingTime: number = 0;
      for (const entry of this.history) {
        if (entry.type === 'start') {
          lastRemainingTime = _.sum(_.map(entry.state.players, (player)=>player.remainingTime));
        } else if (entry.type === 'move') {
          const remainingTime = _.sum(_.map(entry.state.players, (player)=>player.remainingTime));
          config.moveLog.push({
            move: entry.move,
            deltaTime: lastRemainingTime - remainingTime,
          });
          lastRemainingTime = remainingTime;
        } else if (entry.type === 'end') {
          const remainingTime = _.sum(_.map(entry.state.players, (player)=>player.remainingTime));
          config.moveLog.push({
            end: {
              reason: entry.info.reason,
              scores: entry.info.scores,
              winner: entry.info.winner,
            },
            deltaTime: lastRemainingTime - remainingTime,
          });
          lastRemainingTime = remainingTime;
        }
      }
      return config;
    }

    public static GetEmptyBoard(size: number): Board {
      return _.times(size, ()=>_.times(size, ()=>Color.NONE));
    }

    public static get DefaultConfiguration(): GameConfiguration {
      return {
        komi: 6.5,
        ko: true,
        superko: false,
        mercy: 0,
        mercyStart: 50,
        scoringMethod: 'area',
        prisonerScore: 1,
        initialState: {
          board: BoardUtility.getEmptyBoard(19),
          players: {
            [Color.BLACK]: {remainingTime: 10*60*1000, prisoners: 0},
            [Color.WHITE]: {remainingTime: 10*60*1000, prisoners: 0},
          },
          turn: Color.BLACK,
        },
        moveLog: [],
        idleDeltaTime: 0,
      };
    }

    public get CurrentState(): GameState {
      const state = _.cloneDeep(this.history[this.history.length-1].state);
      state.players[state.turn].remainingTime -= this.idleDeltaTime;
      return state;
    }

    public get StateHistory(): GameState[] {
      return _.map(this.history, (entry)=>_.cloneDeep(entry.state));
    }

    public get BoardSize(): number {
      return this.history[this.history.length-1].state.board.length;
    }

    public get Territories(): Board {
      const result = this.Analyze(this.CurrentState.board);
      const territories: Color[] = _.map(result.clusters, (cluster)=>{
        if (cluster.color != Color.NONE) return Color.NONE;
        if (cluster.neighbors[Color.BLACK] > 0 && cluster.neighbors[Color.WHITE] == 0) return Color.BLACK;
        if (cluster.neighbors[Color.WHITE] > 0 && cluster.neighbors[Color.BLACK] == 0) return Color.WHITE;
        return Color.NONE;
      });
      return _.map(result.board, (row)=>_.map(row, (cluster)=>territories[cluster]));
    }

    public get Scores(): {[index: string]:number} {
      const state = this.CurrentState;
      const result = this.Analyze(state.board);
      const scores = {
        [Color.BLACK]: this.configuration.prisonerScore * state.players[Color.BLACK].prisoners,
        [Color.WHITE]: this.configuration.komi + this.configuration.prisonerScore * state.players[Color.WHITE].prisoners,
      };
      for (const cluster of result.clusters) {
        if (cluster.color === Color.NONE) {
          if (cluster.neighbors[Color.BLACK]>0 && cluster.neighbors[Color.WHITE]==0) scores[Color.BLACK]+=cluster.count;
          else if (cluster.neighbors[Color.WHITE]>0 && cluster.neighbors[Color.BLACK]==0) scores[Color.WHITE]+=cluster.count;
        } else if (this.configuration.scoringMethod === 'area') {
          scores[cluster.color] += cluster.count;
        }
      }
      return scores;
    }

    private static getWinnerFromScores(scores: {[index: string]:number}): Color {
      return scores[Color.BLACK]==scores[Color.WHITE]?Color.NONE:(scores[Color.BLACK]>scores[Color.WHITE]?Color.BLACK:Color.WHITE);
    }

    public get EndGameInfo(): EndGameInfo | null {
      const lastEntry = this.history[this.history.length - 1];
      return lastEntry.type == 'end'?lastEntry.info:null;
    }

    public get HasGameEnded(): boolean {
      const lastEntry = this.history[this.history.length - 1];
      return lastEntry.type == 'end';
    }

    public timeout() {
      const nextState = _.cloneDeep(this.CurrentState);
      nextState.players[nextState.turn].remainingTime = 0;
      this.idleDeltaTime = 0;
      this.history.push({
        type: 'end',
        state: nextState,
        info: {
          winner: ColorUtility.FlipColor(nextState.turn),
          reason: 'timeout',
          scores: this.Scores,
        },
      });
    }

    public pause(idleDeltaTime: number) {
      this.idleDeltaTime += idleDeltaTime;
    }

    public apply(move: Move, deltaTime: number): {valid: boolean, state: GameState, message?: string} {
      const state = this.CurrentState;
      const nextState: GameState = _.cloneDeep(state);
      nextState.players[nextState.turn].remainingTime -= deltaTime;
      if (move.type === 'resign') {
        this.idleDeltaTime = 0;
        this.history.push({
          type: 'move',
          state: nextState,
          move: move,
        });
        this.history.push({
          type: 'end',
          state: nextState,
          info: {
            winner: ColorUtility.FlipColor(nextState.turn),
            reason: 'resign',
            scores: this.Scores,
          },
        });
        return {valid: true, state: nextState};
      } else if (move.type === 'pass') {
        this.idleDeltaTime = 0;
        nextState.turn = ColorUtility.FlipColor(nextState.turn);
        if (this.configuration.passAddsToPrisoners) nextState.players[nextState.turn].prisoners++;
        this.history.push({
          type: 'move',
          state: nextState,
          move: move,
        });
        const previousEntry = this.history[this.history.length-2];
        if (previousEntry.type == 'move' && previousEntry.move.type == 'pass') {
          const scores = this.Scores;
          this.history.push({
            type: 'end',
            state: nextState,
            info: {
              winner: GoGame.getWinnerFromScores(scores),
              reason: 'pass',
              scores: this.Scores,
            },
          });
        } else if (this.configuration.mercy != 0 && this.history.length-1 >= this.configuration.mercyStart) {
          const scores = this.Scores;
          if (Math.abs(scores[Color.BLACK] - scores[Color.WHITE]) >= this.configuration.mercy) {
            this.history.push({
              type: 'end',
              state: nextState,
              info: {
                winner: GoGame.getWinnerFromScores(scores),
                reason: 'mercy',
                scores: this.Scores,
              },
            });
          }
        }
        return {valid: true, state: nextState};
      } else if (move.type === 'place') {
        if (move.point.row < 0 || move.point.row >= this.BoardSize || move.point.column < 0 || move.point.column >= this.BoardSize) {
          return {valid: false, state: this.CurrentState, message: 'Out of Bound'};
        }
        if (nextState.board[move.point.row][move.point.column] != Color.NONE) {
          return {valid: false, state: this.CurrentState, message: 'Nonempty point'};
        }
        nextState.board[move.point.row][move.point.column] = nextState.turn;
        const result = this.Analyze(nextState.board);
        const nextTurn: Color = ColorUtility.FlipColor(nextState.turn);
        let killed = false;
        for (let id = 0; id < result.clusters.length; id++) {
          const cluster = result.clusters[id];
          if (cluster.color == nextTurn && cluster.neighbors[Color.NONE]==0) {
            killed = true;
            for (let row: number = 0; row < this.BoardSize; row++) {
              for (let column: number = 0; column < this.BoardSize; column++) {
                if (result.board[row][column] == id) {
                  nextState.board[row][column] = Color.NONE;
                  nextState.players[nextState.turn].prisoners++;
                }
              }
            }
          }
        }
        if (!killed) {
          if (result.clusters[result.board[move.point.row][move.point.column]].neighbors[Color.NONE]==0) {
            return {valid: false, state: this.CurrentState, message: 'Suicide'};
          }
        }
        nextState.turn = nextTurn;
        if (this.configuration.superko && _.some(this.history, (entry) => _.isEqual(entry.state.board, nextState.board) && entry.state.turn == nextState.turn)) {
          return {valid: false, state: this.CurrentState, message: 'SuperKo'};
        }
        if (this.configuration.ko && this.history.length >= 2 && _.isEqual(this.history[this.history.length-2].state.board, nextState.board)) {
          return {valid: false, state: this.CurrentState, message: 'Ko'};
        }
        this.history.push({
          type: 'move',
          state: nextState,
          move: move,
        });
        this.idleDeltaTime = 0;
        if (this.configuration.mercy != 0 && this.history.length-1 >= this.configuration.mercyStart) {
          const scores = this.Scores;
          if (Math.abs(scores[Color.BLACK] - scores[Color.WHITE]) >= this.configuration.mercy) {
            this.history.push({
              type: 'end',
              state: nextState,
              info: {
                winner: GoGame.getWinnerFromScores(scores),
                reason: 'mercy',
                scores: this.Scores,
              },
            });
          }
        }
        return {valid: true, state: nextState};
      } else {
        return {valid: false, state: this.CurrentState, message: 'Invalid type'};
      }
    }

    public undo() {
      let lastEntry = this.history[this.history.length - 1];
      if (lastEntry.type == 'end') {
        this.history.pop();
        lastEntry = this.history[this.history.length - 1];
      }
      if (lastEntry.type != 'start') {
        this.history.pop();
      }
    }

    private Analyze(board: Board): {board: number[][], clusters: {color: Color, count: number, neighbors: {[index: string]:number}}[]} {
      const boardSize: number = this.BoardSize;
      const idCount: number = 0;
      const idBoard: number[][] = _.times(boardSize, ()=>_.times(boardSize, ()=>-1));
      const clusters: {color: Color, count: number, neighbors: {[index: string]:number}}[] = [];
      const queue: Point[] = [];

      const adjacency = ({row, column}: Point): Point[] => {
        const adj = [];
        if (row > 0) adj.push({row: row-1, column: column});
        if (column > 0) adj.push({row: row, column: column-1});
        if (row < boardSize-1) adj.push({row: row+1, column: column});
        if (column < boardSize-1) adj.push({row: row, column: column+1});
        return adj;
      };

      for (let row: number = 0; row < boardSize; row++) {
        for (let column: number = 0; column <boardSize; column++) {
          if (idBoard[row][column] != -1) continue;
          const id: number = clusters.length;
          idBoard[row][column] = id;
          const cluster: {color: Color, count: number, neighbors: {[index: string]:number}} = {
            color: board[row][column],
            count: 1,
            neighbors: {[Color.NONE]: 0, [Color.BLACK]: 0, [Color.WHITE]: 0},
          };
          clusters.push(cluster);

          queue.push({row: row, column: column});
          while (queue.length > 0) {
            const current = queue.shift();
            if (!current) continue;
            idBoard[current.row][current.column] = id;
            for (const neighbor of adjacency(current)) {
              if (idBoard[neighbor.row][neighbor.column] == id) continue;
              const neighborColor = board[neighbor.row][neighbor.column];
              if (neighborColor === cluster.color) {
                idBoard[neighbor.row][neighbor.column] = id;
                cluster.count++;
                queue.push(neighbor);
              } else {
                cluster.neighbors[neighborColor]++;
              }
            }
          }
        }
      }
      return {board: idBoard, clusters: clusters};
    }

    public toString(showTerritories: boolean = false, overridestate?: GameState): string {
      const boardSize = this.BoardSize;
      const state: GameState = overridestate ?? this.CurrentState;
      const board: string[][] = _.cloneDeep(state.board);
      if (showTerritories) {
        const territories= this.Territories;
        for (let row: number = 0; row < boardSize; row++) {
          for (let column: number = 0; column < boardSize; column++) {
            const color = territories[row][column];
            if (color !== Color.NONE) {
              board[row][column] = (color as string).toLowerCase();
            }
          }
        }
      }
      const scores = this.Scores;
      const colorNames: {[color:string]:string} = {[Color.BLACK]: 'Black', [Color.WHITE]: 'White'};
      const playersInfo = _.map([Color.BLACK, Color.WHITE],
          (color)=>`${colorNames[color]}: Score=${scores[color]}, Prisoners=${state.players[color].prisoners}, Time Remaining=${TimeUtility.Format(state.players[color].remainingTime)}`,
      ).join('\n');
      const black = `Black: Score=${scores[Color.BLACK]}, Prisoners=${state.players[Color.BLACK]}, Time Remaining`;
      const header: string = '   ' + PointUtility.ColumnLabels.slice(0, boardSize).join(' ') + '   \n';
      return header + _.map(board, (row, index)=>{
        const label = (index+1).toString().padStart(2, '0');
        return label + ' ' + row.join(' ') + ' ' + label;
      }).join('\n') + '\n' + header + playersInfo + `\nTurn: ${colorNames[state.turn]}`;
    }
};
