import GoGame from './go';
import { Color, GameConfiguration, Move, GameState, EndGameInfo} from '../types/types';
import * as c from '../types/codecs';
import fs from 'fs';
import _ from 'lodash';
import Tock from 'tocktimer';
import path from 'path';
import dateFormat from 'dateformat';
import winston from 'winston';

enum ManagerState {
    READY,
    PLAYING
}

interface ManagerOptions {
    logger?: winston.Logger,
    tick?: ()=>void,
    end?: (reason: "resign" | "pass" | "timeout")=>void,
    reload?: ()=>void
}

export default class GameManager {
    private options: ManagerOptions;
    private configLayers: { 
        configFile: GameConfiguration | null,
        checkpointFile: GameConfiguration | null,
    } = { configFile: null, checkpointFile: null };

    private timer = Tock({countdown: true, interval: 500, callback: ()=>{this.clockTick()}, complete: ()=>{this.timeout()}});

    private state: ManagerState;
    private game: GoGame;
    private volatile: boolean;

    private logger?: winston.Logger;

    static readonly CheckpointPath: string = "./checkpoints/checkpoint.json";
    static readonly GameConfigPath: string = "./game.config.json";

    public constructor(options?: ManagerOptions){
        this.options = options ?? {};
        this.logger = this.options.logger;
        this.configLayers.configFile = this.readConfig(GameManager.GameConfigPath);
        this.configLayers.checkpointFile = this.readConfig(GameManager.CheckpointPath);
        
        fs.watch(".", (event, filename) => {
            if(filename == path.basename(GameManager.GameConfigPath)) {
                this.logger?.info?.(`File "./game.config.json" fired a watch event ${event}, reloading configuration`);
                this.configLayers.configFile = this.readConfig(GameManager.GameConfigPath);
            }
            if(this.state !== ManagerState.PLAYING && this.volatile) {
                this.game.Configuration = this.Configuration;
                options?.reload?.();
            }
        });
        const checkpointsFolderPath = path.dirname(GameManager.CheckpointPath);
        if(!fs.existsSync(checkpointsFolderPath))
            fs.mkdirSync(checkpointsFolderPath);
        fs.watch(checkpointsFolderPath, (event, filename) => {
            if(filename == path.basename(GameManager.CheckpointPath)) {
                this.logger?.info?.(`File "./checkpoints/checkpoint.json" fired a watch event ${event}, reloading configuration`);
                this.configLayers.configFile = this.readConfig(GameManager.CheckpointPath);
            }
            if(this.state !== ManagerState.PLAYING && this.volatile) {
                this.game.Configuration = this.Configuration;
                options?.reload?.();
            }
        });

        this.game = new GoGame(this.Configuration);
        this.state = ManagerState.READY;
        this.volatile = true;
    }

    private readConfig(filePath: string): GameConfiguration | null {
        if(fs.existsSync(filePath)){
            try {
                const configObject = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const result = c.GameConfiguration.decode(configObject);
                if(result._tag != 'Left') return result.right;
                else {
                    this.logger?.error?.(`Failed to decode "${filePath}"`);
                    return null;
                }
            } catch (error) {
                this.logger?.error?.(`Failed to read/parse "${filePath}" due to ${error}`);
                return null;
            }
        } else return null;
    }

    private saveCheckpoint() {
        this.logger?.info?.(`Saving a checkpoint...`);
        let config = this.game.Configuration;
        config.idleDeltaTime = this.game.CurrentState.players[this.game.CurrentState.turn].remainingTime - this.timer.lap();
        fs.writeFileSync(GameManager.CheckpointPath, JSON.stringify(config, null, 4));
    }

    public clearCheckpoint() {
        if(this.state == ManagerState.READY){
            this.logger?.info?.(`Clearing the checkpoint...`);
            this.volatile = true;
            if(fs.existsSync(GameManager.CheckpointPath)){
                const discardedPath = path.join(path.dirname(GameManager.CheckpointPath), `discarded-${dateFormat(new Date(), 'yyyy-mm-dd-HH-MM-ss')}.json`);
                fs.renameSync(GameManager.CheckpointPath, discardedPath);
            }
            this.options.reload?.();
        }
    }

    private archiveCheckpoint(){
        const filepath = path.join(path.dirname(GameManager.CheckpointPath), `archive-${dateFormat(new Date(), 'yyyy-mm-dd-HH-MM-ss')}.json`);
        this.logger?.info?.(`Archiving the checkpoint to ${filepath}`);
        fs.writeFileSync(filepath, JSON.stringify(this.game.Configuration, null, 4));
        if(fs.existsSync(GameManager.CheckpointPath)){
            fs.unlinkSync(GameManager.CheckpointPath);
        }
    }

    public get Configuration() : GameConfiguration {
        if(this.state == ManagerState.PLAYING){
            return this.game.Configuration;
        } else {
            if(this.configLayers.checkpointFile !== null) return this.configLayers.checkpointFile;
            else if(this.configLayers.configFile !== null) return this.configLayers.configFile;
            else return GoGame.DefaultConfiguration;
        }
    }

    public get HasCheckpoint() : boolean {
        return this.configLayers.checkpointFile !== null;
    }

    public start() {
        if(this.state == ManagerState.PLAYING) return;
        
        let config = this.Configuration;
        this.game.Configuration = config;
        this.timer.start(this.game.CurrentState.players[this.game.CurrentState.turn].remainingTime - config.idleDeltaTime);
        this.state = ManagerState.PLAYING;
        this.volatile = false;
    }

    public stop() {
        this.timer.pause();
        this.saveCheckpoint();
    }

    public apply(move: Move) {
        if(this.state != ManagerState.PLAYING) return {valid: false, state: this.game.CurrentState, message:"No Game"};

        this.timer.pause();
        let result = this.game.apply(move, this.game.CurrentState.players[this.game.CurrentState.turn].remainingTime - this.timer.lap());
        if(result.valid){
            this.saveCheckpoint();
            this.timer.reset();
            this.timer.start(this.game.CurrentState.players[this.game.CurrentState.turn].remainingTime);
        } else {
            this.timer.pause();
        }
        if(this.game.HasGameEnded) {
            this.logger?.info?.(`Game has ended.`);
            this.timer.stop();
            this.archiveCheckpoint();
            process.nextTick(()=>this.options.end?.(this.game.EndGameInfo?.reason ?? "pass"));
        }
        return result;
    }

    private clockTick(){
        this.options.tick?.();
    }

    private timeout(){
        if(this.state == ManagerState.PLAYING){
            this.logger?.info?.(`Timeout.`);
            this.timer.stop();
            this.game.timeout();
            this.archiveCheckpoint();
            this.state = ManagerState.READY;
            this.options.end?.("timeout");
        }
    }

    public get CurrentState(): GameState {
        let state = _.cloneDeep(this.game.CurrentState);
        if(this.state == ManagerState.PLAYING)
            state.players[state.turn].remainingTime = this.timer.lap();
        else
            state.players[state.turn].remainingTime -= this.Configuration.idleDeltaTime;
        return state;
    }

    public get EndGameInfo(): EndGameInfo | null {
        return this.game.EndGameInfo;
    }

    public get HasGameEnded(): boolean {
        return this.game.HasGameEnded;
    }

    public get Scores() {
        return this.game.Scores;
    }

    public toString(showTerritories: boolean = false): string {
        return this.game.toString(showTerritories, this.CurrentState);
    }
}