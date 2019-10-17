import GoGame from './Go';
import { Color, GameConfiguration} from '../types/types';
import * as c from '../types/codecs';
import fs from 'fs';
import _ from 'lodash';
import Tock from 'tocktimer';

enum ManagerState {
    READY,
    PLAYING,
    STOPPED
}

export default class GameManager {
    private configLayers: { 
        configFile: GameConfiguration | null,
        checkpointFile: GameConfiguration | null,
    } = { configFile: null, checkpointFile: null };

    private timers = {
        [Color.BLACK]: Tock({countdown: true, interval: 50, callback: ()=>{this.clockTick()}, complete: ()=>{this.timeout(Color.BLACK)}}),
        [Color.WHITE]: Tock({countdown: true, interval: 50, callback: ()=>{this.clockTick()}, complete: ()=>{this.timeout(Color.BLACK)}}),
    }

    private state: ManagerState;
    private game: GoGame;

    public constructor(){
        this.configLayers.configFile = this.readConfig("./game.config.json");
        this.configLayers.checkpointFile = this.readConfig("./checkpoints/checkpoint.json");
        
        fs.watch(".", (event, filename) => {
            if(filename == "game.config.json") this.configLayers.configFile = this.readConfig("./game.config.json");
            if(this.state !== ManagerState.PLAYING) this.game.Configuration = this.Configuration;
        });
        fs.watch("./checkpoints", (event, filename) => {
            if(filename == "checkpoint.json") this.configLayers.configFile = this.readConfig("./checkpoints/checkpoint.json");
            if(this.state !== ManagerState.PLAYING) this.game.Configuration = this.Configuration;
        });

        this.game = new GoGame(this.Configuration);
        this.state = ManagerState.READY;
    }

    private readConfig(filePath: string): GameConfiguration | null {
        if(fs.existsSync(filePath)){
            const configObject = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const result = c.GameConfiguration.decode(configObject);
            if(result._tag != 'Left') return result.right;
            else return null;
        } else return null;
    }

    public get Configuration() : GameConfiguration {
        if(this.state == ManagerState.PLAYING || this.state == ManagerState.STOPPED){
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
        
    }

    private clockTick(){

    }

    private timeout(player: Color){
        if(this.state == ManagerState.PLAYING){
            this.game.timeout();
            this.state = ManagerState.STOPPED;
        }
    }
}