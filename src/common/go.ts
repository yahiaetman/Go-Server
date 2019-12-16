import _ from 'lodash';
import { Color, Move, Board, LogEntry, GameState, GameConfiguration, Point } from '../types/types';
import * as ColorUtility from '../types/color.utils'
import { PointUtility } from '../types/point.utils';
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
    reason: 'resign' | 'pass' | 'timeout',
    scores: {[index: string]:number} 
}

export default class GoGame {
    private configuration!: GameConfiguration;
    private history!: HistoryEntry[];
    private idleDeltaTime!: number;

    constructor (configuration?: GameConfiguration){
        this.Configuration = configuration || GoGame.DefaultConfiguration;
    }

    public set Configuration(configuration: GameConfiguration) {
        this.configuration = configuration;
        this.idleDeltaTime = configuration.idleDeltaTime;
        this.history = [{
            type: 'start',
            state: this.configuration.initialState,
        }];
        for(let entry of this.configuration.moveLog){
            if(entry.move)
                this.apply(entry.move, entry.deltaTime);
            else if(entry.end){
                const end = entry.end;
                let state = _.cloneDeep(this.CurrentState);
                state.players[state.turn].remainingTime -= entry.deltaTime;
                this.history.push({
                    type: 'end',
                    state: state,
                    info: end
                });
            }
        }
    }

    public get Configuration(): GameConfiguration {
        let config = _.cloneDeep(this.configuration);
        config.moveLog = [];
        config.idleDeltaTime = this.idleDeltaTime;
        let lastRemainingTime: number = 0;
        for(let entry of this.history){
            if(entry.type === "start"){
                lastRemainingTime = _.sum(_.map(entry.state.players, (player)=>player.remainingTime));
            } else if (entry.type === "move") {
                let remainingTime = _.sum(_.map(entry.state.players, (player)=>player.remainingTime));
                config.moveLog.push({
                    move: entry.move,
                    deltaTime: lastRemainingTime - remainingTime
                });
                lastRemainingTime = remainingTime;
            } else if(entry.type === "end") {
                let remainingTime = _.sum(_.map(entry.state.players, (player)=>player.remainingTime));
                config.moveLog.push({
                    end: {
                        reason: entry.info.reason,
                        scores: entry.info.scores,
                        winner: entry.info.winner
                    },
                    deltaTime: lastRemainingTime - remainingTime
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
            scoringMethod: 'area',
            prisonerScore: 1,
            initialState: {
                board: BoardUtility.getEmptyBoard(19),
                players: {
                    [Color.BLACK]: {remainingTime: 10*60*1000, prisoners: 0},
                    [Color.WHITE]: {remainingTime: 10*60*1000, prisoners: 0}
                },
                turn: Color.BLACK
            },
            moveLog: [],
            idleDeltaTime: 0
        };
    }

    public get CurrentState(): GameState {
        let state = _.cloneDeep(this.history[this.history.length-1].state);
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
        let result = this.Analyze(this.CurrentState.board);
        let territories: Color[] = _.map(result.clusters, (cluster)=>{
            if(cluster.color != Color.NONE) return Color.NONE;
            if(cluster.neighbors[Color.BLACK] > 0 && cluster.neighbors[Color.WHITE] == 0) return Color.BLACK;
            if(cluster.neighbors[Color.WHITE] > 0 && cluster.neighbors[Color.BLACK] == 0) return Color.WHITE;
            return Color.NONE;
        });
        return _.map(result.board, (row)=>_.map(row, (cluster)=>territories[cluster]));
    }

    public get Scores(): {[index: string]:number} {
        let state = this.CurrentState;
        let result = this.Analyze(state.board);
        let scores = {
            [Color.BLACK]: this.configuration.prisonerScore * state.players[Color.BLACK].prisoners,
            [Color.WHITE]: this.configuration.komi + this.configuration.prisonerScore * state.players[Color.WHITE].prisoners
        };
        for(let cluster of result.clusters){
            if(cluster.color === Color.NONE){
                if(cluster.neighbors[Color.BLACK]>0 && cluster.neighbors[Color.WHITE]==0) scores[Color.BLACK]+=cluster.count;
                else if(cluster.neighbors[Color.WHITE]>0 && cluster.neighbors[Color.BLACK]==0) scores[Color.WHITE]+=cluster.count;
            } else if(this.configuration.scoringMethod === "area"){
                scores[cluster.color] += cluster.count;
            }
        }
        return scores;
    }

    public get EndGameInfo(): EndGameInfo | null {
        let lastEntry = this.history[this.history.length - 1];
        return lastEntry.type == 'end'?lastEntry.info:null;
    }

    public get HasGameEnded(): boolean {
        let lastEntry = this.history[this.history.length - 1];
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
                scores: this.Scores
            }
        });
    }

    public pause(idleDeltaTime: number){
        this.idleDeltaTime += idleDeltaTime;
    }

    public apply(move: Move, deltaTime: number): {valid: boolean, state: GameState, message?: string} {
        let state = this.CurrentState;
        let nextState: GameState = _.cloneDeep(state);
        nextState.players[nextState.turn].remainingTime -= deltaTime;
        if(move.type === 'resign'){
            this.idleDeltaTime = 0;
            this.history.push({
                type: 'move',
                state: nextState,
                move: move
            });
            this.history.push({
                type: 'end',
                state: nextState,
                info: {
                    winner: ColorUtility.FlipColor(nextState.turn),
                    reason: "resign",
                    scores: this.Scores
                }
            });
            return {valid: true, state: nextState};
        } else if(move.type === 'pass'){
            this.idleDeltaTime = 0;
            nextState.turn = ColorUtility.FlipColor(nextState.turn);
            //nextState.players[nextState.turn].prisoners++;
            this.history.push({
                type: 'move',
                state: nextState,
                move: move
            });
            const previousEntry = this.history[this.history.length-2];
            if(previousEntry.type == "move" && previousEntry.move.type == "pass"){
                const scores = this.Scores;
                this.history.push({
                    type: 'end',
                    state: nextState,
                    info: {
                        winner: scores[Color.BLACK]==scores[Color.WHITE]?Color.NONE:(scores[Color.BLACK]>scores[Color.WHITE]?Color.BLACK:Color.WHITE),
                        reason: "pass",
                        scores: this.Scores
                    }
                });
            }
            return {valid: true, state: nextState};
        } else if(move.type === 'place'){
            if(move.point.row < 0 || move.point.row >= this.BoardSize || move.point.column < 0 || move.point.column >= this.BoardSize){
                return {valid: false, state: this.CurrentState, message: "Out of Bound"};
            }
            if(nextState.board[move.point.row][move.point.column] != Color.NONE){
                return {valid: false, state: this.CurrentState, message: "Nonempty point"};
            }
            nextState.board[move.point.row][move.point.column] = nextState.turn;
            let result = this.Analyze(nextState.board);
            let nexTurn: Color = ColorUtility.FlipColor(nextState.turn);
            let killed = false;
            for(let id = 0; id < result.clusters.length; id++){
                let cluster = result.clusters[id];
                if(cluster.color == nexTurn && cluster.neighbors[Color.NONE]==0){
                    killed = true;
                    for(let row: number = 0; row < this.BoardSize; row++){
                        for(let column: number = 0; column < this.BoardSize; column++){
                            if(result.board[row][column] == id){
                                nextState.board[row][column] = Color.NONE;
                                nextState.players[nextState.turn].prisoners++;
                            }
                        }
                    }
                }
            }
            if(!killed){
                if(result.clusters[result.board[move.point.row][move.point.column]].neighbors[Color.NONE]==0){
                    return {valid: false, state: this.CurrentState, message: 'Suicide'};
                }
            }
            if(this.configuration.ko && this.history.length >= 2 && _.isEqual(this.history[this.history.length-2].state.board, nextState.board)){
                return {valid: false, state: this.CurrentState, message: 'Ko'};
            }
            nextState.turn = nexTurn;
            this.history.push({
                type: 'move',
                state: nextState,
                move: move
            });
            this.idleDeltaTime = 0;
            return {valid: true, state: nextState};
        } else {
            return {valid: false, state: this.CurrentState, message: "Invalid type"};
        }
    }

    public undo() {
        let lastEntry = this.history[this.history.length - 1];
        if(lastEntry.type == 'end'){
            this.history.pop();
            lastEntry = this.history[this.history.length - 1];
        }
        if(lastEntry.type != 'start'){
            this.history.pop();
        }
    }

    private Analyze(board: Board): {board: number[][], clusters: {color: Color, count: number, neighbors: {[index: string]:number}}[]}{
        const boardSize: number = this.BoardSize;
        let idCount: number = 0;
        let idBoard: number[][] = _.times(boardSize, ()=>_.times(boardSize, ()=>-1));
        let clusters: {color: Color, count: number, neighbors: {[index: string]:number}}[] = [];
        let queue: Point[] = [];

        const adjacency = ({row, column}: Point): Point[] => {
            let adj = [];
            if(row > 0) adj.push({row: row-1, column: column});
            if(column > 0) adj.push({row: row, column: column-1});
            if(row < boardSize-1) adj.push({row: row+1, column: column});
            if(column < boardSize-1) adj.push({row: row, column: column+1});
            return adj;
        }
        
        for(let row: number = 0; row < boardSize; row++){
            for(let column: number = 0; column <boardSize; column++){
                if(idBoard[row][column] != -1) continue;
                let id: number = clusters.length;
                idBoard[row][column] = id;
                const cluster: {color: Color, count: number, neighbors: {[index: string]:number}} = {
                    color: board[row][column],
                    count: 1,
                    neighbors: {[Color.NONE]:0, [Color.BLACK]:0, [Color.WHITE]:0}
                }
                clusters.push(cluster);

                queue.push({row: row, column: column});
                while(queue.length > 0){
                    const current = queue.shift();
                    if(!current) continue;
                    idBoard[current.row][current.column] = id;
                    for(const neighbor of adjacency(current)){
                        if(idBoard[neighbor.row][neighbor.column] == id) continue;
                        const neighborColor = board[neighbor.row][neighbor.column]
                        if(neighborColor === cluster.color){
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
        let state: GameState = overridestate ?? this.CurrentState;
        let board: string[][] = _.cloneDeep(state.board);
        if(showTerritories){
            let territories= this.Territories;
            for(let row: number = 0; row < boardSize; row++){
                for(let column: number = 0; column < boardSize; column++){
                    let color = territories[row][column];
                    if(color !== Color.NONE)
                        board[row][column] = (color as string).toLowerCase();
                }
            }
        }
        let scores = this.Scores;
        let colorNames: {[color:string]:string} = {[Color.BLACK]:"Black", [Color.WHITE]:"White"};
        let playersInfo = _.map([Color.BLACK, Color.WHITE],
            (color)=>`${colorNames[color]}: Score=${scores[color]}, Prisoners=${state.players[color].prisoners}, Time Remaining=${TimeUtility.Format(state.players[color].remainingTime)}`
            ).join("\n");
        let black = `Black: Score=${scores[Color.BLACK]}, Prisoners=${state.players[Color.BLACK]}, Time Remaining`
        let header: string = '   ' + PointUtility.ColumnLabels.slice(0, boardSize).join(' ') + '   \n';
        return header + _.map(board, (row, index)=>{
            const label = (index+1).toString().padStart(2,'0');
            return label + ' ' + row.join(' ') + ' ' + label;
        }).join('\n') + '\n' + header + playersInfo + `\nTurn: ${colorNames[state.turn]}`;
    }
};