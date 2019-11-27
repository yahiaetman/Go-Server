import _ from 'lodash';
import fs from 'fs';
import WebSocket from 'ws';
import winston from 'winston';
import * as codecs from '../types/codecs';
import * as types from '../types/types';
import * as MessageTypes from '../types/client-messages.type';
import * as MessageCodecs from '../types/client-messages.codec';
import { Either } from 'fp-ts/lib/Either';
import { Errors, object } from 'io-ts';
import GameManager from '../common/game-manager';
import { FlipColor } from '../types/color.utils';

enum ServerState {
    INIT,
    IDLE
};

interface Client {
    id: number,
    name: string,
    ip: string,
    socket: WebSocket,
    ready: boolean,
    alive: boolean,
    color: types.Color
};

type ServerEvent = {
    type: "CONNECT", // A Client wants to connect to the server
    client: Client
} | {
    type: "CLOSE", // A Client connection is closed
    client: Client
} | {
    type: "MESSAGE", // A Client sent a message
    client: Client,
    message: MessageTypes.MoveMessage
} | {
    type: "START", // The User pressed Start
} | {
    type: "END", // The game ended for one of the reasons found in enum EndReasons
    reason: "resign" | "pass" | "timeout" | "pause" | "error"
} | {
    type: "ENLIST", // A Client is added as a player
    client: Client,
    color: types.Color
} | {
    type: "DISCHARGE", // A Client is removed from the player list
    client: Client
} | {
    type: "DISCONNECT", // The User pressed disconnect for one of the clients
    client: Client
} | {
    type: "SWAP", // The User swapped the order of the clients
};

interface ServerOptions {
    logger?: winston.Logger,
    gameUpdate?: ()=>void,
    serverUpdate?: ()=>void,
    statusUpdate?: (message: string)=>void
};

export class Server {
    private options: ServerOptions;
    private configuration: types.ServerConfiguration = {
        host: "0.0.0.0",
        port: 8080,
        pingInterval: 1000
    };

    private state: ServerState = ServerState.INIT;
    private server: WebSocket.Server;
    private clients: Client[] = [];
    private heartbeat: NodeJS.Timeout;

    private gameManager: GameManager;
    
    static readonly ConfigPath: string = './server.config.json';
    
    private static IDCounter: number = 0;
    private static generateID(): number { return this.IDCounter++; }

    constructor(options?: ServerOptions){
        this.options = options ?? {};

        if(fs.existsSync(Server.ConfigPath)){
            try {
                let result = codecs.ServerConfiguration.decode(JSON.parse(fs.readFileSync(Server.ConfigPath, 'utf8')));
                if(result._tag == 'Right') this.configuration = result.right;
                else { /*TODO: Log problem*/ }
            } catch (error) {
                //TODO: Log exception
            }
        }

        this.server = new WebSocket.Server({
            host: this.configuration.host,
            port: this.configuration.port
        });

        this.server.on("listening", ()=>{
            //TODO: log
            this.options.statusUpdate?.(`Server is listening to ${this.configuration.host}:${this.configuration.port}`);
        });
        this.server.on("connection", (socket, request)=>{
            let client: Client = {
                id: Server.generateID(),
                name: "",
                ip: request.connection.remoteAddress??"",
                socket: socket,
                alive: true,
                ready: false,
                color: types.Color.NONE
            };
            socket.on("pong", ()=>{
                client.alive = true;
            });
            socket.send(JSON.stringify({type:"NAME"}));
            socket.on("message", (data)=>{
                let result: Either<Errors, MessageTypes.ClientMessage> = MessageCodecs.ClientMessage.decode(JSON.parse(data.toString()));
                if(result._tag == "Right"){
                    let message = result.right;
                    if(client.ready){
                        if(message.type == 'MOVE'){
                            this.processEvent({ type:"MESSAGE", client: client, message: message });
                        } else {
                            //TODO: Log
                        }
                    } else {
                        if(message.type == 'NAME'){
                            client.name = message.name;
                            client.ready = true;
                            this.clients.push(client);
                            this.processEvent({type:"CONNECT", client: client});
                        } else {
                            //TODO: Log
                        }
                    }
                } else {
                    //TODO: log faulty message
                    this.options.statusUpdate?.(`Invalid message format received`);
                }
            });

            socket.on("close", (code, reason) => {
                this.processEvent({type:"CLOSE", client: client});
            });

            socket.on("error", (err) => {
                // Any error will automatically fire a close event after it is done
                //TODO: log
            });
        });

        this.heartbeat = setInterval(()=>{
            for(const client of this.clients){
                if(client.alive){
                    client.alive = false;
                    client.socket.ping(() => {});
                } else {
                    //TODO: Log disconnection
                    client.socket.terminate();
                }
            }
        }, this.configuration.pingInterval);

        this.gameManager = new GameManager({
            logger: this.options.logger,
            tick: ()=>{},
            end: (reason)=>{ this.processEvent({type:"END", reason:reason}); },
            reload: ()=>{this.options.gameUpdate?.()}
        });
    }

    public get GameManager() {
        return this.gameManager;
    }

    public get Clients() {
        return [...this.clients];
    }

    public get Players(): {[name: string]: Client | null} {
        return {
            [types.Color.BLACK]: this.clients.find(c=>c.color==types.Color.BLACK) ?? null,
            [types.Color.WHITE]: this.clients.find(c=>c.color==types.Color.WHITE) ?? null
        }
    }

    public get Ready(): boolean {
        let players = this.Players
        return players[types.Color.BLACK] != null && players[types.Color.WHITE] != null;
    }

    public start(){
        this.processEvent({type:"START"});
    }

    public stop(){
        this.processEvent({type:"END", reason:"pause"});
    }

    public enlist(client: Client, color: types.Color){
        this.processEvent({type:"ENLIST", client:client, color:color});
    }

    public discharge(client: Client){
        this.processEvent({type:"DISCHARGE", client:client});
    }

    public swap(){
        this.processEvent({type:"SWAP"});
    }

    public disconnect(client: Client){
        this.processEvent({type:"DISCONNECT", client:client});
    }

    private processEvent(event: ServerEvent){
        if(this.state == ServerState.INIT){
            switch(event.type){
                case "CONNECT":{
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "CLOSE":{
                    let index = this.clients.findIndex((v)=>v===event.client);
                    if(index != -1){
                        this.clients.splice(index, 1);
                    }
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "ENLIST":{
                    let players = this.Players;
                    let colorHolder = players[event.color];
                    if(colorHolder != null) colorHolder.color = types.Color.NONE;
                    event.client.color = event.color;
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "DISCHARGE":{
                    event.client.color = types.Color.NONE;
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "DISCONNECT":{
                    event.client.socket.close(1000, 'Server disconnected you');
                    //TODO: log
                    break;
                }
                case "SWAP":{
                    for (const client of this.clients) {
                        if(client.color == types.Color.BLACK) client.color = types.Color.WHITE;
                        else if(client.color == types.Color.WHITE) client.color = types.Color.BLACK;
                    }
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "START":{
                    if(this.Ready){
                        this.state = ServerState.IDLE;
                        let players = this.Players;
                        _.forEach(this.Players, (player, color)=>{
                            player?.socket.send(JSON.stringify({ type: "START", configuration: this.gameManager.Configuration, color: color}));
                        });
                        this.gameManager.start();
                        this.options.gameUpdate?.();
                        //TODO: log
                    } else {
                        //TODO: log
                    }
                    break;
                }
                default:{
                    //TODO: Log inacceptable event
                }
            }
        } else if(this.state == ServerState.IDLE){
            switch(event.type){
                case "CONNECT":{
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "CLOSE":{
                    let index = this.clients.findIndex((v)=>v===event.client);
                    if(index != -1){
                        this.clients.splice(index, 1);
                    }
                    if(event.client.color != types.Color.NONE){
                        process.nextTick(()=>{this.processEvent({type:"END", reason:"error"})});
                    }
                    this.options.serverUpdate?.();
                    //TODO: log
                    break;
                }
                case "DISCONNECT":{
                    if(event.client.color == types.Color.NONE)
                        event.client.socket.close(1000, 'Server disconnected you');
                    break;
                }
                case "END":{
                    let message = {
                        type: "END",
                        reason: event.reason,
                        winner: ".",
                        players: {}
                    };
                    if(event.reason == "error" || event.reason == "pause") {
                        this.gameManager.stop();
                        let scores = this.gameManager.Scores;
                        let state = this.gameManager.CurrentState;
                        message.players = {
                            [types.Color.BLACK]:{score: scores[types.Color.BLACK], remainingTime: state.players[types.Color.BLACK].remainingTime},
                            [types.Color.WHITE]:{score: scores[types.Color.WHITE], remainingTime: state.players[types.Color.WHITE].remainingTime}
                        } 
                    } else {
                        let endGameInfo = this.gameManager.EndGameInfo;
                        let scores = endGameInfo?.scores ?? {[types.Color.BLACK]:0, [types.Color.WHITE]:0};
                        let state = this.gameManager.CurrentState;
                        message.winner = endGameInfo?.winner ?? types.Color.NONE;
                        message.players = {
                            [types.Color.BLACK]:{score: scores[types.Color.BLACK], remainingTime: state.players[types.Color.BLACK].remainingTime},
                            [types.Color.WHITE]:{score: scores[types.Color.WHITE], remainingTime: state.players[types.Color.WHITE].remainingTime}
                        } 
                    }
                    let players = this.Players;
                    for (const color in players) {
                        const player = players[color];
                        if(player != null){
                            player.socket.send(JSON.stringify(message));
                        }
                    }
                    this.options.gameUpdate?.();
                    //TODO: log
                    break;
                }
                case "MESSAGE":{
                    let turn = this.gameManager.CurrentState.turn;
                    let other = FlipColor(turn);
                    let players = this.Players;
                    let result = this.gameManager.apply(event.message.move);
                    let remainingTime = _.mapValues(result.state.players, (value)=>value.remainingTime);
                    if(result.valid){
                        players[turn]?.socket?.send?.(JSON.stringify({type:"VALID", remainingTime:remainingTime}));
                        players[other]?.socket?.send?.(JSON.stringify({type:"MOVE", move:event.message.move, remainingTime:remainingTime}));
                    } else {
                        players[turn]?.socket?.send?.(JSON.stringify({type:"INVALID", message:result.message, remainingTime:remainingTime}));
                    }
                    this.options.gameUpdate?.();
                    //TODO: log
                    break;
                }
                default: {
                    //TODO: Log inacceptable event
                }
            }
        }
    }

    public close(){
        clearInterval(this.heartbeat);
        this.server.close();
        //TODO: log
    }

};